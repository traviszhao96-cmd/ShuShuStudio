import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import type { IncomingMessage } from 'node:http'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const root = resolve('/Users/travis.zhao/SSMaster')
const dbPath = resolve(root, 'db/cases.sqlite')
const exportScriptPath = resolve(root, 'scripts/export-cases-from-sqlite.mjs')

type PersistCasePayload = {
  id: string
  name: string
  group: '家人' | '同学' | '同事' | '名人' | '朋友' | '评测'
  birthTimeText: string
  birthTime: number
}

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolveBody, rejectBody) => {
    let data = ''

    req.on('data', (chunk) => {
      data += chunk
    })

    req.on('end', () => resolveBody(data))
    req.on('error', rejectBody)
  })
}

function escapeSql(value: string) {
  return value.replaceAll("'", "''")
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-cases-api',
      configureServer(server) {
        server.middlewares.use('/api/cases/save', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }))
            return
          }

          try {
            const body = await readBody(req)
            const payload = JSON.parse(body) as { cases?: PersistCasePayload[] }
            const cases = payload.cases ?? []

            const statements = ['BEGIN TRANSACTION;']

            for (const item of cases) {
              const rawId = item.id.replace('db-case-', '')
              const id = Number(rawId)

              if (!Number.isInteger(id)) continue

              statements.push(`
                UPDATE cases
                SET
                  name = '${escapeSql(item.name)}',
                  birth_time_text = '${escapeSql(item.birthTimeText)}',
                  birth_time_index = ${item.birthTime},
                  birth_time_source = 'manual',
                  manual_group = ${item.group === '评测' ? 'NULL' : `'${escapeSql(item.group)}'`}
                WHERE id = ${id};
              `)
            }

            statements.push('COMMIT;')

            execFileSync('sqlite3', [dbPath, statements.join('\n')], {
              cwd: root,
              encoding: 'utf8',
            })

            execFileSync('node', [exportScriptPath], {
              cwd: root,
              encoding: 'utf8',
            })

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, count: cases.length }))
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                ok: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              }),
            )
          }
        })
      },
    },
  ],
})
