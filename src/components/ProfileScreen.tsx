import { ChevronRight, LogIn, LogOut, UserRound } from 'lucide-react'
import type { AuthUser } from '../authClient'

type ProfileScreenProps = {
  user: AuthUser | null
  caseName: string
  caseCount: number
  onLogin: () => void
  onLogout: () => void
  onOpenCases: () => void
}

export function ProfileScreen({ user, caseName, caseCount, onLogin, onLogout, onOpenCases }: ProfileScreenProps) {
  return (
    <main className="profile-screen">
      <header className="profile-identity">
        <span><UserRound size={28} strokeWidth={1.6} /></span>
        <div>
          <p className="section-kicker">Personal Profile</p>
          <h1>{caseName}</h1>
          <p>{user?.email ?? '当前使用本地档案'}</p>
        </div>
      </header>

      <section className="profile-stats">
        <div><strong>{caseCount}</strong><span>命例</span></div>
        <div><strong>1</strong><span>进行中计划</span></div>
        <div><strong>3</strong><span>待校准判断</span></div>
      </section>

      <section className="profile-list">
        {['命例管理', '人生方向档案', '职业计划与行动记录', '分析报告', '数据与隐私'].map((item) => (
          <button key={item} type="button" onClick={item === '命例管理' ? onOpenCases : undefined}>
            <span>{item}</span>
            <ChevronRight size={16} />
          </button>
        ))}
      </section>

      <button type="button" className="profile-auth-button" onClick={user ? onLogout : onLogin}>
        {user ? <LogOut size={17} /> : <LogIn size={17} />}
        {user ? '退出登录' : '登录并同步档案'}
      </button>
    </main>
  )
}
