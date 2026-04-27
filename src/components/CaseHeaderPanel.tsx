import * as ScrollArea from '@radix-ui/react-scroll-area'
import * as Tabs from '@radix-ui/react-tabs'
import type { CaseGroupFilter } from '../data'

type CasePreview = {
  id: string
  name: string
  group: string
  note: string
  solarLabel: string
  lunarLabel: string
  zodiac: string
  zodiacIcon: string
}

type CaseHeaderPanelProps = {
  open: boolean
  activeCaseId: string
  activeGroup: CaseGroupFilter
  groups: readonly CaseGroupFilter[]
  activeCase: CasePreview
  visibleCases: CasePreview[]
  onToggleOpen: () => void
  onActivateCase: (caseId: string) => void
  onSetGroup: (group: CaseGroupFilter) => void
  onAddCase?: () => void
}

export function CaseHeaderPanel({
  open,
  activeCaseId,
  activeGroup,
  groups,
  activeCase,
  visibleCases,
  onToggleOpen,
  onActivateCase,
  onSetGroup,
  onAddCase,
}: CaseHeaderPanelProps) {
  return (
    <header className={`case-header-panel ${open ? 'is-open' : ''}`} data-slot="hero-panel">
      <div className="case-header-top">
        <div className="case-current-card" data-slot="hero-main">
          <div className="case-current-inline">
            <span className="case-inline-item case-inline-zodiac" aria-hidden="true">
              {activeCase.zodiacIcon}
            </span>
            <span className="case-inline-item case-inline-name">{activeCase.name}</span>
            <span className="case-inline-item">{activeCase.group}</span>
            <span className="case-inline-item">阳历 {activeCase.solarLabel}</span>
            <span className="case-inline-item">农历 {activeCase.lunarLabel}</span>
            <span className="case-inline-item">{activeCase.zodiac}</span>
          </div>
        </div>

        <div className="case-toggle-slot" data-slot="hero-toggle">
          <button type="button" className="browser-toggle-inline" onClick={onToggleOpen}>
            <span className={`browser-toggle-icon ${open ? 'is-open' : ''}`} aria-hidden="true">
              ▾
            </span>
            <span>{open ? '收起命例列表' : '展开命例列表'}</span>
          </button>
        </div>

        <div className="case-action-box" data-slot="hero-side">
          <button type="button" className="add-case-button" onClick={onAddCase}>
            <span aria-hidden="true">＋</span>
            <span>新增命例</span>
          </button>
        </div>
      </div>

      <div className="case-browser-panel">
        <Tabs.Root
          value={activeGroup}
          onValueChange={(value) => onSetGroup(value as CaseGroupFilter)}
          className="case-browser-tabs"
        >
          <Tabs.List className="case-group-tabs" aria-label="命例分组">
            {groups.map((group) => (
              <Tabs.Trigger key={group} value={group} className="group-tab">
                {group}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value={activeGroup} className="case-browser-content" forceMount>
            <ScrollArea.Root className="case-scroll-root">
              <ScrollArea.Viewport className="case-scroll-viewport">
                <div className="case-rail" role="list">
                  {visibleCases.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`case-rail-item ${item.id === activeCaseId ? 'is-active' : ''}`}
                      onClick={() => onActivateCase(item.id)}
                    >
                      <strong>{item.name}</strong>
                      <span>{item.lunarLabel}</span>
                      <small>
                        {item.zodiacIcon} {item.group}
                      </small>
                    </button>
                  ))}
                </div>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar className="case-scrollbar" orientation="vertical">
                <ScrollArea.Thumb className="case-scroll-thumb" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </header>
  )
}
