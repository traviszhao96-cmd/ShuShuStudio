import { Check, ChevronLeft, Plus, UserRound } from 'lucide-react'
import type { CaseGroupFilter } from '../data'
import type { CaseRecord } from '../types'
import { buildCasePreview } from '../utils'

type CaseLibraryScreenProps = {
  cases: CaseRecord[]
  activeCaseId: string
  activeGroup: CaseGroupFilter
  groups: readonly CaseGroupFilter[]
  onBack: () => void
  onSetGroup: (group: CaseGroupFilter) => void
  onActivateCase: (caseId: string) => void
  onAddCase: () => void
}

export function CaseLibraryScreen({
  cases,
  activeCaseId,
  activeGroup,
  groups,
  onBack,
  onSetGroup,
  onActivateCase,
  onAddCase,
}: CaseLibraryScreenProps) {
  const visibleCases = activeGroup === '全部' ? cases : cases.filter((item) => item.group === activeGroup)

  return (
    <main className="case-library-screen">
      <header className="case-library-heading">
        <button type="button" className="case-library-back" onClick={onBack} aria-label="返回">
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="section-kicker">Profiles</p>
          <h1>命例管理</h1>
          <p>选择当前分析对象，首页建议与所有工具会随之切换。</p>
        </div>
        <button
          type="button"
          className="case-library-add"
          onClick={onAddCase}
        >
          <Plus size={17} />
          新增
        </button>
      </header>

      <nav className="case-library-groups" aria-label="命例分组">
        {groups.map((group) => (
          <button
            key={group}
            type="button"
            className={group === activeGroup ? 'is-active' : ''}
            onClick={() => onSetGroup(group)}
          >
            {group}
          </button>
        ))}
      </nav>

      <section className="case-library-grid">
        {visibleCases.map((item) => {
          const preview = buildCasePreview(item)
          const isActive = item.id === activeCaseId
          return (
            <button
              key={item.id}
              type="button"
              className={`case-library-card ${isActive ? 'is-active' : ''}`}
              onClick={() => onActivateCase(item.id)}
            >
              <span className="case-library-avatar"><UserRound size={20} strokeWidth={1.6} /></span>
              <span className="case-library-copy">
                <strong>{item.name}</strong>
                <small>{preview.solarHeaderLabel}</small>
                <small>{item.note || `${item.group}命例`}</small>
              </span>
              <span className="case-library-status">
                {isActive ? <Check size={17} /> : <span>切换</span>}
              </span>
            </button>
          )
        })}
      </section>
    </main>
  )
}
