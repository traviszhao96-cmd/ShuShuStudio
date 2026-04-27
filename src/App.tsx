import { useDeferredValue, useMemo, useState } from 'react'
import { CaseHeaderPanel } from './components/CaseHeaderPanel'
import { ChartStage } from './components/ChartStage'
import { InsightSidebar } from './components/InsightSidebar'
import { caseGroups, caseRecords, defaultCase } from './data'
import type { CaseGroupFilter } from './data'
import { buildCasePreview, buildChartSummary } from './utils'
import './App.css'

function App() {
  const [activeCaseId, setActiveCaseId] = useState(defaultCase.id)
  const [activeGroup, setActiveGroup] = useState<CaseGroupFilter>('全部')
  const [isBrowserOpen, setIsBrowserOpen] = useState(false)

  const activeCase = caseRecords.find((item) => item.id === activeCaseId) ?? defaultCase
  const deferredCase = useDeferredValue(activeCase)
  const chart = buildChartSummary(deferredCase)

  const visibleCases = useMemo(() => {
    const scoped =
      activeGroup === '全部'
        ? caseRecords
        : caseRecords.filter((item) => item.group === activeGroup)

    return scoped.map(buildCasePreview)
  }, [activeGroup])

  const activePreview = useMemo(() => buildCasePreview(activeCase), [activeCase])

  function handleSetGroup(group: CaseGroupFilter) {
    setActiveGroup(group)

    if (group === '全部') return

    if (activeCase.group === group) return

    const firstMatch = caseRecords.find((item) => item.group === group)
    if (firstMatch) {
      setActiveCaseId(firstMatch.id)
    }
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
        onToggleOpen={() => setIsBrowserOpen((value) => !value)}
        onActivateCase={setActiveCaseId}
        onSetGroup={handleSetGroup}
        onAddCase={() => {}}
      />

      <main className="workspace" data-slot="workspace">
        <ChartStage config={deferredCase} />
        <InsightSidebar chart={chart} />
      </main>
    </div>
  )
}

export default App
