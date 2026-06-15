import { createHmac, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const port = readInt('PORT', 3000)
const guestDailyLimit = readInt('GUEST_DAILY_REQUEST_LIMIT', 10)
const maxInputChars = readInt('MAX_INPUT_CHARS', 120_000)
const maxOutputTokens = readInt('MAX_OUTPUT_TOKENS', 6_000)
const dataDir = process.env.DATA_DIR ?? 'data'
const deepseekUrl = process.env.DEEPSEEK_API_URL ?? 'https://api.deepseek.com/chat/completions'
const defaultDeepseekModel = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-pro'
const allowedDeepseekModels = new Set(['deepseek-v4-flash', 'deepseek-v4-pro'])
const deepseekApiKey = process.env.DEEPSEEK_API_KEY ?? ''
const tokenSecret = process.env.TOKEN_SECRET ?? ''

if (!deepseekApiKey) throw new Error('DEEPSEEK_API_KEY is required')
if (tokenSecret.length < 32) throw new Error('TOKEN_SECRET must contain at least 32 characters')

mkdirSync(dataDir, { recursive: true })
const db = new DatabaseSync(join(dataDir, 'fateish.sqlite'))
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS daily_usage (
    subject TEXT NOT NULL,
    usage_date TEXT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (subject, usage_date)
  );
  CREATE TABLE IF NOT EXISTS idempotent_replies (
    subject TEXT NOT NULL,
    request_key TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (subject, request_key)
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_salt TEXT,
    password_hash TEXT,
    provider TEXT NOT NULL DEFAULT 'email',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS user_cases (
    owner_id TEXT PRIMARY KEY,
    data_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );
`)

const activeRequests = new Map()
const recentRequests = new Map()
const allowedOrigins = new Set([
  'capacitor://localhost',
  'https://localhost',
  'https://fateish.cn',
  'https://www.fateish.cn',
])

const server = createServer(async (request, response) => {
  const requestId = randomUUID()
  try {
    setCommonHeaders(request, response, requestId)
    if (request.method === 'OPTIONS') return send(response, 204)

    const url = new URL(request.url ?? '/', 'http://localhost')
    if (request.method === 'GET' && url.pathname === '/healthz') {
      return sendJson(response, 200, { status: 'ok', service: 'fateish-api' })
    }

    if (request.method === 'POST' && url.pathname === '/v1/auth/guest') {
      const subject = `guest:${createHmac('sha256', tokenSecret).update(readClientIp(request)).digest('hex').slice(0, 32)}`
      return sendJson(response, 201, {
        access_token: signToken({ sub: subject, provider: 'guest', exp: unixNow() + 30 * 86400 }),
        token_type: 'Bearer',
        expires_in: 30 * 86400,
      })
    }

    if (request.method === 'POST' && url.pathname === '/v1/auth/email') {
      return await handleEmailLogin(request, response)
    }

    if (request.method === 'POST' && url.pathname === '/v1/auth/wechat') {
      return sendJson(response, 501, {
        error: 'wechat_not_configured',
        message: '微信开放平台应用审核通过后启用。',
      })
    }

    if (request.method === 'POST' && url.pathname === '/v1/chat/completions') {
      return await handleChat(request, response)
    }

    if (request.method === 'GET' && url.pathname === '/v1/cases') {
      return handleGetCases(request, response)
    }

    if (request.method === 'PUT' && url.pathname === '/v1/cases') {
      return await handleSaveCases(request, response)
    }

    return sendJson(response, 404, { error: 'not_found' })
  } catch (error) {
    console.error(JSON.stringify({ requestId, error: error instanceof Error ? error.message : String(error) }))
    return sendJson(response, 500, { error: 'internal_error', request_id: requestId })
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(JSON.stringify({ status: 'listening', port, defaultModel: defaultDeepseekModel }))
})

async function handleChat(request, response) {
  const claims = readBearerClaims(request)
  if (!claims) return sendJson(response, 401, { error: 'invalid_token' })
  if (claims.provider === 'guest') return sendJson(response, 403, { error: 'login_required', message: '请先登录后再开始分析。' })

  if (!consumeMinuteSlot(claims.sub)) {
    return sendJson(response, 429, { error: 'rate_limited', message: '请求太快，请稍后再试。' })
  }

  const remaining = getRemainingDailyRequests(claims.sub)
  if (remaining <= 0) {
    return sendJson(response, 429, { error: 'daily_limit_reached', remaining: 0 })
  }

  const idempotencyKey = String(request.headers['idempotency-key'] ?? '').trim()
  if (!idempotencyKey || idempotencyKey.length > 100) {
    return sendJson(response, 400, { error: 'idempotency_key_required' })
  }

  const cached = db.prepare(
    'SELECT status_code, response_body FROM idempotent_replies WHERE subject = ? AND request_key = ?',
  ).get(claims.sub, idempotencyKey)
  if (cached) {
    response.setHeader('X-Idempotent-Replay', 'true')
    return send(response, cached.status_code, cached.response_body, 'application/json; charset=utf-8')
  }

  const activeKey = `${claims.sub}:${idempotencyKey}`
  if (activeRequests.has(activeKey)) {
    return sendJson(response, 409, { error: 'request_in_progress' })
  }

  const body = await readJson(request)
  const messages = validateMessages(body?.messages)
  if (!messages) return sendJson(response, 400, { error: 'invalid_messages' })
  const selectedModel = selectModel(body?.model)
  if (!selectedModel) return sendJson(response, 400, { error: 'invalid_model' })

  const inputChars = messages.reduce((sum, message) => sum + message.content.length, 0)
  if (inputChars > maxInputChars) {
    return sendJson(response, 413, { error: 'input_too_large', max_input_chars: maxInputChars })
  }

  activeRequests.set(activeKey, true)
  try {
    const upstreamResponse = await fetch(deepseekUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        stream: false,
        max_tokens: maxOutputTokens,
        messages,
      }),
      signal: AbortSignal.timeout(180_000),
    })

    const upstreamText = await upstreamResponse.text()
    const safeStatus = upstreamResponse.ok ? 200 : upstreamResponse.status

    if (upstreamResponse.ok) {
      recordUsage(claims.sub, parseUsage(upstreamText))
      db.prepare(
        'INSERT INTO idempotent_replies (subject, request_key, status_code, response_body) VALUES (?, ?, ?, ?)',
      ).run(claims.sub, idempotencyKey, safeStatus, upstreamText)
      console.log(JSON.stringify({ event: 'completion', subject: claims.sub, model: selectedModel }))
    }

    return send(response, safeStatus, upstreamText, 'application/json; charset=utf-8')
  } finally {
    activeRequests.delete(activeKey)
  }
}

async function handleEmailLogin(request, response) {
  if (!consumeMinuteSlot(`login:${readClientIp(request)}`)) {
    return sendJson(response, 429, { error: 'rate_limited', message: '登录尝试过于频繁，请稍后再试。' })
  }
  const body = await readJson(request)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password) return sendJson(response, 400, { error: 'invalid_credentials', message: '请输入账号和登录密码。' })

  const user = db.prepare(
    'SELECT id, email, password_salt, password_hash, provider FROM users WHERE email = ?',
  ).get(email)
  if (!user?.password_salt || !user?.password_hash || !verifyPassword(password, user.password_salt, user.password_hash)) {
    return sendJson(response, 401, { error: 'invalid_credentials', message: '账号或登录密码不正确。' })
  }

  return sendJson(response, 200, {
    access_token: signToken({ sub: user.id, email: user.email, provider: user.provider, exp: unixNow() + 30 * 86400 }),
    token_type: 'Bearer',
    expires_in: 30 * 86400,
    user: { id: user.id, email: user.email, provider: user.provider },
  })
}

function handleGetCases(request, response) {
  const claims = readUserClaims(request)
  if (!claims) return sendJson(response, 401, { error: 'invalid_token' })
  const row = db.prepare('SELECT data_json FROM user_cases WHERE owner_id = ?').get(claims.sub)
  try {
    return sendJson(response, 200, { cases: JSON.parse(row?.data_json ?? '[]') })
  } catch {
    return sendJson(response, 500, { error: 'invalid_case_data' })
  }
}

async function handleSaveCases(request, response) {
  const claims = readUserClaims(request)
  if (!claims) return sendJson(response, 401, { error: 'invalid_token' })
  const body = await readJson(request)
  if (!Array.isArray(body?.cases) || body.cases.length > 500) {
    return sendJson(response, 400, { error: 'invalid_cases' })
  }
  const dataJson = JSON.stringify(body.cases)
  db.prepare(`
    INSERT INTO user_cases (owner_id, data_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(owner_id) DO UPDATE SET data_json = excluded.data_json, updated_at = CURRENT_TIMESTAMP
  `).run(claims.sub, dataJson)
  return sendJson(response, 200, { saved: body.cases.length })
}

function selectModel(value) {
  if (value === undefined || value === null || value === '') return defaultDeepseekModel
  return typeof value === 'string' && allowedDeepseekModels.has(value) ? value : null
}

function validateMessages(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 24) return null
  const messages = []
  for (const message of value) {
    if (!message || typeof message !== 'object') return null
    if (!['system', 'user', 'assistant'].includes(message.role)) return null
    if (typeof message.content !== 'string' || !message.content.trim()) return null
    messages.push({ role: message.role, content: message.content })
  }
  return messages
}

async function readJson(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 256_000) throw new Error('request_body_too_large')
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return null
  }
}

function consumeMinuteSlot(subject) {
  const now = Date.now()
  const recent = (recentRequests.get(subject) ?? []).filter((timestamp) => now - timestamp < 60_000)
  if (recent.length >= 3) return false
  recent.push(now)
  recentRequests.set(subject, recent)
  return true
}

function getRemainingDailyRequests(subject) {
  const row = db.prepare(
    'SELECT request_count FROM daily_usage WHERE subject = ? AND usage_date = ?',
  ).get(subject, today())
  return Math.max(0, guestDailyLimit - Number(row?.request_count ?? 0))
}

function recordUsage(subject, usage) {
  db.prepare(`
    INSERT INTO daily_usage (subject, usage_date, request_count, input_tokens, output_tokens)
    VALUES (?, ?, 1, ?, ?)
    ON CONFLICT(subject, usage_date) DO UPDATE SET
      request_count = request_count + 1,
      input_tokens = input_tokens + excluded.input_tokens,
      output_tokens = output_tokens + excluded.output_tokens
  `).run(subject, today(), usage.inputTokens, usage.outputTokens)
}

function parseUsage(responseText) {
  try {
    const usage = JSON.parse(responseText)?.usage ?? {}
    return {
      inputTokens: Number(usage.prompt_tokens ?? 0),
      outputTokens: Number(usage.completion_tokens ?? 0),
    }
  } catch {
    return { inputTokens: 0, outputTokens: 0 }
  }
}

function signToken(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', tokenSecret).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

function readBearerClaims(request) {
  const token = String(request.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return null

  const expected = createHmac('sha256', tokenSecret).update(encoded).digest('base64url')
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null

  try {
    const claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (typeof claims.sub !== 'string' || Number(claims.exp) <= unixNow()) return null
    return claims
  } catch {
    return null
  }
}

function readUserClaims(request) {
  const claims = readBearerClaims(request)
  return claims && claims.provider !== 'guest' ? claims : null
}

function verifyPassword(password, saltHex, expectedHashHex) {
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), 32)
  const expected = Buffer.from(expectedHashHex, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function setCommonHeaders(request, response, requestId) {
  const origin = String(request.headers.origin ?? '')
  const isLocalDevelopmentOrigin = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin)
  if (allowedOrigins.has(origin) || isLocalDevelopmentOrigin) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  }
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Idempotency-Key')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Request-Id', requestId)
}

function readClientIp(request) {
  const forwarded = String(request.headers['x-forwarded-for'] ?? '').split(',')[0].trim()
  return forwarded || request.socket.remoteAddress || 'unknown'
}

function sendJson(response, statusCode, body) {
  return send(response, statusCode, JSON.stringify(body), 'application/json; charset=utf-8')
}

function send(response, statusCode, body = '', contentType) {
  response.statusCode = statusCode
  if (contentType) response.setHeader('Content-Type', contentType)
  response.end(body)
}

function readInt(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? '', 10)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())
}

function unixNow() {
  return Math.floor(Date.now() / 1000)
}
