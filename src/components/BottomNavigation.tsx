import { Compass, House, UserRound } from 'lucide-react'

export type AppTab = 'home' | 'explore' | 'profile'

type BottomNavigationProps = {
  active: AppTab
  onChange: (tab: AppTab) => void
}

const items = [
  { id: 'home' as const, label: '首页', icon: House },
  { id: 'explore' as const, label: '探索', icon: Compass },
  { id: 'profile' as const, label: '个人', icon: UserRound },
]

export function BottomNavigation({ active, onChange }: BottomNavigationProps) {
  return (
    <nav className="bottom-navigation" aria-label="主导航">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            className={active === item.id ? 'is-active' : ''}
            onClick={() => onChange(item.id)}
          >
            <Icon size={20} strokeWidth={active === item.id ? 2.2 : 1.7} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
