import * as ScrollArea from '@radix-ui/react-scroll-area'
import * as Tabs from '@radix-ui/react-tabs'
import { LoaderCircle, Pencil, Plus, RefreshCw, Save } from 'lucide-react'
import { useState } from 'react'
import type { CaseGroupFilter } from '../data'
import type { BaziPillars, CaseRecord } from '../types'
import { toTimeIndex } from '../utils'

type CasePreview = {
  id: string
  name: string
  group: string
  note: string
  solarLabel: string
  lunarLabel: string
  solarHeaderLabel: string
  lunarHeaderLabel: string
  headerLabel: string
  birthTimeText: string
  zodiac: string
  zodiacIcon: string
}

type EditableField = 'name' | 'time' | 'group'

type CaseHeaderPanelProps = {
  open: boolean
  activeCaseId: string
  loadingCaseId?: string | null
  activeGroup: CaseGroupFilter
  groups: readonly CaseGroupFilter[]
  activeCase: CasePreview
  visibleCases: Array<CasePreview & CaseRecord>
  isEditing: boolean
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  onToggleOpen: () => void
  onActivateCase: (caseId: string) => void
  onSetGroup: (group: CaseGroupFilter) => void
  onToggleEdit: () => void
  onSaveCases: () => void
  onUpdateCase: (caseId: string, patch: Partial<CaseRecord>) => void
  onAddCase?: () => void
}

export function CaseHeaderPanel({
  open,
  activeCaseId,
  loadingCaseId,
  activeGroup,
  groups,
  activeCase,
  visibleCases,
  isEditing,
  saveStatus,
  onToggleOpen,
  onActivateCase,
  onSetGroup,
  onToggleEdit,
  onSaveCases,
  onUpdateCase,
  onAddCase,
}: CaseHeaderPanelProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null)

  function handleUpdateField(
    caseId: string,
    field: EditableField,
    value: string | CaseRecord['group'],
  ) {
    if (field === 'name') {
      onUpdateCase(caseId, { name: String(value).trim() || '未命名命例' })
      return
    }

    if (field === 'time') {
      const birthTimeText = String(value)
      onUpdateCase(caseId, {
        birthTimeText,
        birthTime: toTimeIndex(birthTimeText),
        birthTimeSource: 'manual',
      })
      return
    }

    onUpdateCase(caseId, { group: value as CaseRecord['group'] })
  }

  function buildEditorKey(caseId: string, field: EditableField) {
    return `${caseId}:${field}`
  }

  function formatBazi(bazi?: BaziPillars | null) {
    if (!bazi) return '八字未生成'
    return [bazi.yearPillar, bazi.monthPillar, bazi.dayPillar, bazi.hourPillar ?? '时辰待定'].join(' ')
  }

  return (
    <header className={`case-header-panel ${open ? 'is-open' : ''}`} data-slot="hero-panel">
      <div className="case-header-top">
        <div className="case-current-card" data-slot="hero-main">
          <div className="case-current-summary">
            <div className="case-current-line">
              <strong className="case-current-name" title={activeCase.name}>
                <span className="case-current-zodiac" aria-hidden="true">
                  {activeCase.zodiacIcon}
                </span>
                <span className="case-current-name-text">{activeCase.name}</span>
              </strong>
              <span className="case-current-date" title={activeCase.solarHeaderLabel}>
                {activeCase.solarHeaderLabel}
              </span>
              <span className="case-current-date case-current-lunar" title={activeCase.lunarHeaderLabel}>
                {activeCase.lunarHeaderLabel}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="case-expand-button"
            onClick={onToggleOpen}
            aria-expanded={open}
            aria-label={open ? '收起命例列表' : '展开命例列表'}
          >
            <span className={`case-inline-arrow ${open ? 'is-open' : ''}`} aria-hidden="true">
              ▾
            </span>
          </button>
        </div>
      </div>

      <div className="case-browser-panel">
        <Tabs.Root
          value={activeGroup}
          onValueChange={(value) => onSetGroup(value as CaseGroupFilter)}
          className="case-browser-tabs"
        >
          <div className="case-browser-toolbar">
            <Tabs.List className="case-group-tabs" aria-label="命例分组">
              {groups.map((group) => (
                <Tabs.Trigger key={group} value={group} className="group-tab">
                  {group}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <div className="case-browser-actions">
              <button type="button" className="case-toolbar-icon-button" onClick={onAddCase} aria-label="新增命例" title="新增命例">
                <Plus size={15} strokeWidth={2} />
              </button>
              <button
                type="button"
                className={`case-edit-toggle ${isEditing ? 'is-active' : ''} ${saveStatus === 'saved' ? 'is-saved' : ''} ${saveStatus === 'error' ? 'is-error' : ''}`}
                onClick={() => {
                  if (isEditing || saveStatus === 'error') {
                    onSaveCases()
                  }
                  if (saveStatus !== 'error') {
                    onToggleEdit()
                  }
                }}
                disabled={saveStatus === 'saving'}
                aria-label={
                  saveStatus === 'saving'
                    ? '保存中'
                    : saveStatus === 'error'
                      ? '重试保存'
                      : isEditing
                        ? '保存命例'
                        : '编辑命例'
                }
                title={isEditing ? '保存命例' : '编辑命例'}
              >
                {saveStatus === 'saving' ? (
                  <LoaderCircle className="case-toolbar-loading-icon" size={15} />
                ) : saveStatus === 'error' ? (
                  <RefreshCw size={15} />
                ) : isEditing ? (
                  <Save size={15} />
                ) : (
                  <Pencil size={15} />
                )}
              </button>
            </div>
          </div>

          <Tabs.Content value={activeGroup} className="case-browser-content" forceMount>
            <ScrollArea.Root className="case-scroll-root">
              <ScrollArea.Viewport className="case-scroll-viewport">
                <div className="case-rail" role="list">
                  {visibleCases.map((item) => (
                    <article
                      key={item.id}
                      className={`case-rail-item ${item.id === activeCaseId ? 'is-active' : ''} ${isEditing ? 'is-editing' : ''}`}
                    >
                      <button type="button" className="case-rail-select" onClick={() => onActivateCase(item.id)}>
                        <strong title={item.name}>{item.name}</strong>
                        <span title={item.lunarLabel}>{item.lunarLabel}</span>
                        <span className="case-rail-bazi" title={formatBazi(item.bazi)}>{formatBazi(item.bazi)}</span>
                        <span className="case-rail-trailing">
                          <small>{item.group}</small>
                          {item.id === loadingCaseId ? (
                            <span className="case-loading-spinner" role="status" aria-label="命例加载中" />
                          ) : null}
                        </span>
                      </button>

                      {isEditing ? (
                        <div className="case-inline-editor">
                          <label className="case-edit-row">
                            <span>名字</span>
                            <button
                              type="button"
                              className="case-edit-control case-edit-control-button"
                              onClick={() => setEditingKey(buildEditorKey(item.id, 'name'))}
                            >
                              {editingKey === buildEditorKey(item.id, 'name') ? (
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(event) => handleUpdateField(item.id, 'name', event.target.value)}
                                  onBlur={() => setEditingKey(null)}
                                  autoFocus
                                />
                              ) : (
                                <em>{item.name}</em>
                              )}
                            </button>
                          </label>

                          <label className="case-edit-row">
                            <span>时间</span>
                            <button
                              type="button"
                              className="case-edit-control case-edit-control-button"
                              onClick={() => setEditingKey(buildEditorKey(item.id, 'time'))}
                            >
                              {editingKey === buildEditorKey(item.id, 'time') ? (
                                <input
                                  type="time"
                                  value={item.birthTimeText}
                                  step={1800}
                                  onChange={(event) => handleUpdateField(item.id, 'time', event.target.value)}
                                  onBlur={() => setEditingKey(null)}
                                  autoFocus
                                />
                              ) : (
                                <em>{item.birthTimeText}</em>
                              )}
                            </button>
                          </label>

                          <label className="case-edit-row">
                            <span>分类</span>
                            <button
                              type="button"
                              className="case-edit-control case-edit-control-button"
                              onClick={() => setEditingKey(buildEditorKey(item.id, 'group'))}
                            >
                              {editingKey === buildEditorKey(item.id, 'group') ? (
                                <select
                                  value={item.group}
                                  onChange={(event) =>
                                    handleUpdateField(item.id, 'group', event.target.value as CaseRecord['group'])
                                  }
                                  onBlur={() => setEditingKey(null)}
                                  autoFocus
                                >
                                  {groups
                                    .filter((group) => group !== '全部')
                                    .map((group) => (
                                      <option key={group} value={group}>
                                      {group}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <em>{item.group}</em>
                              )}
                            </button>
                          </label>
                        </div>
                      ) : null}
                    </article>
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
