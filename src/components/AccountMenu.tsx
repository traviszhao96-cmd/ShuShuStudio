import { LogIn, LogOut, UserRound, X } from 'lucide-react'
import type { AuthUser } from '../authClient'

type AccountMenuProps = {
  open: boolean
  user: AuthUser | null
  caseCount: number
  onToggle: () => void
  onLogin: () => void
  onLogout: () => void
}

export function AccountMenu({ open, user, caseCount, onToggle, onLogin, onLogout }: AccountMenuProps) {
  const avatarLabel = user?.email?.slice(0, 1).toUpperCase()

  return (
    <div className={`account-menu ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className={`account-avatar-button ${user ? 'is-signed-in' : ''}`}
        onClick={onToggle}
        aria-label={open ? '关闭个人中心' : '打开个人中心'}
        aria-expanded={open}
      >
        {open ? <X size={17} strokeWidth={2} /> : avatarLabel || <UserRound size={18} strokeWidth={1.9} />}
      </button>

      {open ? (
        <>
          <button type="button" className="account-menu-backdrop" onClick={onToggle} aria-label="关闭个人中心" />
          <section className="account-menu-panel" aria-label="个人中心">
            <header className="account-menu-header">
              <span className={`account-menu-avatar ${user ? 'is-signed-in' : ''}`} aria-hidden="true">
                {avatarLabel || <UserRound size={20} strokeWidth={1.8} />}
              </span>
              <div>
                <p className="section-kicker">Fate-ish Account</p>
                <strong>{user?.email ?? '尚未登录'}</strong>
              </div>
            </header>
            <div className="account-menu-stats">
              <span>云端命例</span>
              <strong>{user ? caseCount : '—'}</strong>
            </div>
            <button
              type="button"
              className={`account-menu-action ${user ? 'is-logout' : ''}`}
              onClick={user ? onLogout : onLogin}
            >
              {user ? <LogOut size={16} /> : <LogIn size={16} />}
              {user ? '退出登录' : '登录账号'}
            </button>
          </section>
        </>
      ) : null}
    </div>
  )
}
