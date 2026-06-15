import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { CaseGroupFilter } from '../data'
import type { CaseRecord, NewCaseInput } from '../types'

type NewCaseDialogProps = {
  open: boolean
  groups: readonly CaseGroupFilter[]
  defaultGroup?: CaseRecord['group']
  onClose: () => void
  onAddCase: (input: NewCaseInput) => void
}

export function NewCaseDialog({ open, groups, defaultGroup = '朋友', onClose, onAddCase }: NewCaseDialogProps) {
  const [newCase, setNewCase] = useState<NewCaseInput>({
    name: '',
    group: defaultGroup,
    note: '',
    birthday: '1990-01-01',
    birthTimeText: '12:00',
    birthdayType: 'solar',
    gender: 'female',
  })

  if (!open) return null

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = newCase.name.trim()
    if (!name || !newCase.birthday || !newCase.birthTimeText) return

    onAddCase({ ...newCase, name, note: newCase.note.trim() })
    setNewCase((current) => ({ ...current, name: '', note: '' }))
    onClose()
  }

  return createPortal((
    <div
      className="case-add-overlay"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form className="case-add-dialog" onSubmit={handleSubmit}>
        <div className="case-add-heading">
          <div>
            <span>新增命例</span>
            <strong>录入出生资料</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭新增命例">
            <X size={17} />
          </button>
        </div>

        <div className="case-add-grid">
          <label className="case-add-field case-add-field--wide">
            <span>姓名</span>
            <input
              value={newCase.name}
              onChange={(event) => setNewCase((current) => ({ ...current, name: event.target.value }))}
              placeholder="输入命例名称"
              autoFocus
              required
            />
          </label>

          <label className="case-add-field">
            <span>分类</span>
            <select
              value={newCase.group}
              onChange={(event) => setNewCase((current) => ({ ...current, group: event.target.value as CaseRecord['group'] }))}
            >
              {groups.filter((group) => group !== '全部').map((group) => <option key={group} value={group}>{group}</option>)}
            </select>
          </label>

          <label className="case-add-field">
            <span>性别</span>
            <select
              value={newCase.gender}
              onChange={(event) => setNewCase((current) => ({ ...current, gender: event.target.value as CaseRecord['gender'] }))}
            >
              <option value="female">女</option>
              <option value="male">男</option>
            </select>
          </label>

          <label className="case-add-field">
            <span>历法</span>
            <select
              value={newCase.birthdayType}
              onChange={(event) => setNewCase((current) => ({ ...current, birthdayType: event.target.value as CaseRecord['birthdayType'] }))}
            >
              <option value="solar">阳历</option>
              <option value="lunar">农历</option>
            </select>
          </label>

          <label className="case-add-field">
            <span>出生日期</span>
            <input
              type="date"
              value={newCase.birthday}
              onChange={(event) => setNewCase((current) => ({ ...current, birthday: event.target.value }))}
              required
            />
          </label>

          <label className="case-add-field">
            <span>出生时间</span>
            <input
              type="time"
              step={1800}
              value={newCase.birthTimeText}
              onChange={(event) => setNewCase((current) => ({ ...current, birthTimeText: event.target.value }))}
              required
            />
          </label>

          <label className="case-add-field case-add-field--wide">
            <span>备注</span>
            <textarea
              value={newCase.note}
              onChange={(event) => setNewCase((current) => ({ ...current, note: event.target.value }))}
              placeholder="可选"
              rows={3}
            />
          </label>
        </div>

        <div className="case-add-actions">
          <button type="button" onClick={onClose}>取消</button>
          <button type="submit" className="is-primary">新增并打开</button>
        </div>
      </form>
    </div>
  ), document.body)
}
