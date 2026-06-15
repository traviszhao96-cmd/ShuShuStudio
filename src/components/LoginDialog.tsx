import { useState } from 'react'
import { LockKeyhole, X } from 'lucide-react'
import { loginWithEmail, type AuthUser } from '../authClient'

type LoginDialogProps = {
  open: boolean
  onClose: () => void
  onSuccess: (accessToken: string, user: AuthUser) => void
}

export function LoginDialog({ open, onClose, onSuccess }: LoginDialogProps) {
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const session = await loginWithEmail(account.trim(), password)
      onSuccess(session.accessToken, session.user)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : '登录失败，请稍后重试。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-overlay" role="presentation" onClick={onClose}>
      <form className="login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-title" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
        <header className="login-dialog-header">
          <span className="login-dialog-icon" aria-hidden="true"><LockKeyhole size={20} /></span>
          <div>
            <p className="section-kicker">Fate-ish Account</p>
            <h2 id="login-title">登录后开始分析</h2>
          </div>
          <button type="button" className="login-dialog-close" onClick={onClose} aria-label="关闭"><X size={18} /></button>
        </header>
        <p className="login-dialog-copy">登录用于保护命例、同步报告与管理分析额度。微信登录审核完成后会替换当前入口。</p>
        <label className="login-field">
          <span>账号</span>
          <input type="text" value={account} onChange={(event) => setAccount(event.target.value)} autoComplete="username" required />
        </label>
        <label className="login-field">
          <span>登录密码</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </label>
        {error ? <p className="login-error">{error}</p> : null}
        <button type="submit" className="login-submit" disabled={isSubmitting}>{isSubmitting ? '正在登录…' : '登录并继续分析'}</button>
        <button type="button" className="login-wechat-placeholder" disabled>微信登录 · 审核后开放</button>
      </form>
    </div>
  )
}
