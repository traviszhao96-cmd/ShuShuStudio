import * as ScrollArea from '@radix-ui/react-scroll-area'
import * as Tabs from '@radix-ui/react-tabs'
import { useState } from 'react'
import type { CaseGroupFilter } from '../data'
import type { CaseRecord } from '../types'
import { toTimeIndex } from '../utils'

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

type EditableField = 'name' | 'time' | 'group'

type CaseHeaderPanelProps = {
  open: boolean
  activeCaseId: string
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
          <div className="case-browser-toolbar">
            <Tabs.List className="case-group-tabs" aria-label="命例分组">
              {groups.map((group) => (
                <Tabs.Trigger key={group} value={group} className="group-tab">
                  {group}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <button type="button" className={`case-edit-toggle ${isEditing ? 'is-active' : ''}`} onClick={onToggleEdit}>
              {isEditing ? '完成' : '编辑'}
            </button>

            <button
              type="button"
              className={`case-save-button ${saveStatus === 'saved' ? 'is-saved' : ''} ${saveStatus === 'error' ? 'is-error' : ''}`}
              onClick={onSaveCases}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving'
                ? '写回中...'
                : saveStatus === 'saved'
                  ? '已写回数据库'
                  : saveStatus === 'error'
                    ? '重试写回'
                    : '写回数据库'}
            </button>
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
                        <strong>{item.name}</strong>
                        <span>{item.lunarLabel}</span>
                        <small>
                          {item.zodiacIcon} {item.group}
                        </small>
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
