import { useDeferredValue, useMemo, useState } from 'react'
import { CaseHeaderPanel } from './components/CaseHeaderPanel'
import { ChartStage } from './components/ChartStage'
import { InsightSidebar } from './components/InsightSidebar'
import { ReportPanel } from './components/ReportPanel'
import { TimelineToolbar } from './components/TimelineToolbar'
import { caseGroups, caseRecords, defaultCase } from './data'
import type { CaseGroupFilter } from './data'
import type { CaseRecord, WorkspaceMode } from './types'
import {
  buildCasePreview,
  buildSihuaRiskSummary,
  buildTimelineModel,
  buildZiweiDoushuInsights,
} from './utils'
import './App.css'

const CASE_DRAFT_STORAGE_KEY = 'ssmaster-case-drafts'

function App() {
  const [casesState, setCasesState] = useState<CaseRecord[]>(() => {
    if (typeof window === 'undefined') return caseRecords

    const raw = window.localStorage.getItem(CASE_DRAFT_STORAGE_KEY)
    if (!raw) return caseRecords

    try {
      return JSON.parse(raw) as CaseRecord[]
    } catch {
      return caseRecords
    }
  })
  const [activeCaseId, setActiveCaseId] = useState(defaultCase.id)
  const [activeGroup, setActiveGroup] = useState<CaseGroupFilter>('全部')
  const [isBrowserOpen, setIsBrowserOpen] = useState(false)
  const [isCaseListEditing, setIsCaseListEditing] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [mode, setMode] = useState<WorkspaceMode>('sanhe')
  const [activeDecadalIndex, setActiveDecadalIndex] = useState<number | null>(null)
  const [activeYear, setActiveYear] = useState<number | null>(null)
  const [timelineDisplayMode, setTimelineDisplayMode] = useState<'decade' | 'yearly'>('decade')

  const activeCase = casesState.find((item) => item.id === activeCaseId) ?? casesState[0] ?? defaultCase
  const deferredCase = useDeferredValue(activeCase)
  const timelineModel = useMemo(() => buildTimelineModel(activeCase, 2026), [activeCase])

  const visibleCases = useMemo(() => {
    const scoped =
      activeGroup === '全部' ? casesState : casesState.filter((item) => item.group === activeGroup)

    return scoped.map(buildCasePreview)
  }, [activeGroup, casesState])

  const activePreview = useMemo(() => buildCasePreview(activeCase), [activeCase])
  const sihuaRisks = useMemo(() => buildSihuaRiskSummary(activeCase), [activeCase])
  const ziweiInsights = useMemo(() => buildZiweiDoushuInsights(activeCase), [activeCase])
  const resolvedDecadalIndex =
    activeDecadalIndex ?? timelineModel?.defaultDecadalIndex ?? timelineModel?.decadalOptions[0]?.palaceIndex ?? 0
  const resolvedYear =
    activeYear ??
    timelineModel?.decadalOptions.find((item) => item.palaceIndex === resolvedDecadalIndex)?.years[0]?.year ??
    timelineModel?.defaultYear ??
    2026

  const activeDecadal =
    timelineModel?.decadalOptions.find((item) => item.palaceIndex === resolvedDecadalIndex) ?? null
  const activeTimelineYear =
    activeDecadal?.years.find((item) => item.year === resolvedYear) ?? activeDecadal?.years[0] ?? null

  const decadeYearLabelsByPalace = useMemo(() => {
    const labels = new Map<number, string>()
    activeDecadal?.years.forEach((item) => {
      labels.set(item.yearlyIndex, `${item.year}年${item.nominalAge}岁`)
    })
    return labels
  }, [activeDecadal])

  const yearlyPalaceLabelsByPalace = useMemo(() => {
    const labels = new Map<number, string>()
    activeTimelineYear?.yearlyPalaceLabels.forEach((label, index) => {
      labels.set(index, label)
    })
    return labels
  }, [activeTimelineYear])

  const decadalPalaceLabelsByPalace = useMemo(() => {
    const labels = new Map<number, string>()
    activeDecadal?.decadalPalaceLabels.forEach((label, index) => {
      labels.set(index, label)
    })
    return labels
  }, [activeDecadal])

  function handleSetGroup(group: CaseGroupFilter) {
    setActiveGroup(group)

    if (group === '全部') return

    if (activeCase.group === group) return

    const firstMatch = casesState.find((item) => item.group === group)
    if (firstMatch) {
      setActiveCaseId(firstMatch.id)
    }
  }

  function handleUpdateCase(caseId: string, patch: Partial<CaseRecord>) {
    setCasesState((current) => {
      const next = current.map((item) => (item.id === caseId ? { ...item, ...patch } : item))
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CASE_DRAFT_STORAGE_KEY, JSON.stringify(next))
      }
      setSaveStatus('idle')
      return next
    })
  }

  async function handleSaveCases() {
    setSaveStatus('saving')

    try {
      const response = await fetch('/api/cases/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cases: casesState.map((item) => ({
            id: item.id,
            name: item.name,
            group: item.group,
            birthTimeText: item.birthTimeText,
            birthTime: item.birthTime,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error(`Save failed with status ${response.status}`)
      }

      window.localStorage.removeItem(CASE_DRAFT_STORAGE_KEY)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }

  function handleSelectDecadal(decadalIndex: number) {
    setActiveDecadalIndex(decadalIndex)
    setTimelineDisplayMode('decade')
  }

  function handleSelectYear(year: number) {
    setActiveYear(year)
    const parentDecadal =
      timelineModel?.decadalOptions.find((item) => item.years.some((entry) => entry.year === year)) ?? null
    if (parentDecadal) {
      setActiveDecadalIndex(parentDecadal.palaceIndex)
    }
    setTimelineDisplayMode('yearly')
  }

  return (
    <div className="page-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <CaseHeaderPanel
        open={isBrowserOpen}
        activeCaseId={activeCaseId}
        activeGroup={activeGroup}
        groups={caseGroups}
        activeCase={activePreview}
        visibleCases={visibleCases}
        isEditing={isCaseListEditing}
        saveStatus={saveStatus}
        onToggleOpen={() => setIsBrowserOpen((value) => !value)}
        onActivateCase={setActiveCaseId}
        onSetGroup={handleSetGroup}
        onToggleEdit={() => setIsCaseListEditing((value) => !value)}
        onSaveCases={handleSaveCases}
        onUpdateCase={handleUpdateCase}
        onAddCase={() => {}}
      />

      <main className="workspace" data-slot="workspace">
        <div className="workspace-main-column">
          <ChartStage
            config={deferredCase}
            mode={mode}
            onChangeMode={setMode}
            timelineOverlay={{
              displayMode: timelineDisplayMode,
              activeYear: resolvedYear,
              decadalPalaceLabelsByPalace,
              decadeYearLabelsByPalace,
              yearlyPalaceLabelsByPalace,
            }}
          />
          {timelineModel ? (
            <TimelineToolbar
              decadalOptions={timelineModel.decadalOptions}
              activeDecadalIndex={resolvedDecadalIndex}
              activeYear={resolvedYear}
              displayMode={timelineDisplayMode}
              onSelectDecadal={handleSelectDecadal}
              onSelectYear={handleSelectYear}
            />
          ) : null}
        </div>

        <InsightSidebar mode={mode} risks={sihuaRisks} insights={ziweiInsights} />
      </main>

      <ReportPanel mode={mode} activeCase={activeCase} />
    </div>
  )
}

export default App
