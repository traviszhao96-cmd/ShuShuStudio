import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { CaseHeaderPanel } from './components/CaseHeaderPanel'
import { ChartBottomAnalysis, ChartStage } from './components/ChartStage'
import { AgentTalkBar } from './components/AgentTalkBar'
import { LoginDialog } from './components/LoginDialog'
import { FirstCaseOnboarding } from './components/FirstCaseOnboarding'
import { InsightSidebar } from './components/InsightSidebar'
import { TimelineToolbar } from './components/TimelineToolbar'
import { AppHome } from './components/AppHome'
import { BottomNavigation, type AppTab } from './components/BottomNavigation'
import { ProfileScreen } from './components/ProfileScreen'
import { CaseLibraryScreen } from './components/CaseLibraryScreen'
import { buildAgentContextMarkdown } from './agent/contextMarkdown'
import { buildChartModel } from './analysis/chartModel'
import { buildOverallAnalysis } from './analysis/overallAnalysis'
import { buildPalaceResult } from './analysis/palaceAnalysis'
import { buildTopicAnalyses } from './analysis/topicAnalysis'
import { caseGroups, defaultCase } from './data'
import type { CaseGroupFilter } from './data'
import { loadCases, persistCases } from './caseStore'
import { clearAuthSession, loadAuthSession, loadCloudCases, saveCloudCases, type AuthUser } from './authClient'
import type { CaseRecord, NewCaseInput, WorkspaceMode } from './types'
import {
  buildBaziPillars,
  buildBaziTimelineModel,
  buildCasePreview,
  buildSihuaRiskSummary,
  buildTimelineModel,
  buildZiweiDoushuInsights,
  toTimeIndex,
} from './utils'
import './App.css'

function App() {
  const initialSession = loadAuthSession()
  const [authUser, setAuthUser] = useState<AuthUser | null>(initialSession?.user ?? null)
  const [accessToken, setAccessToken] = useState<string | null>(initialSession?.accessToken ?? null)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isFirstCaseOnboardingOpen, setIsFirstCaseOnboardingOpen] = useState(false)
  const [casesState, setCasesState] = useState<CaseRecord[]>(loadCases)
  const [activeCaseId, setActiveCaseId] = useState(
    () => loadCases().find((item) => item.name === '赵')?.id ?? loadCases()[0]?.id ?? '',
  )
  const [activeTab, setActiveTab] = useState<AppTab>('home')
  const [activeTool, setActiveTool] = useState<WorkspaceMode | null>(null)
  const [isCaseLibraryOpen, setIsCaseLibraryOpen] = useState(false)
  const [activeGroup, setActiveGroup] = useState<CaseGroupFilter>('全部')
  const [isBrowserOpen, setIsBrowserOpen] = useState(false)
  const [isCaseListEditing, setIsCaseListEditing] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [mode, setMode] = useState<WorkspaceMode>('analysis')
  const [selectedPalaceIndex, setSelectedPalaceIndex] = useState<number | null>(null)
  const [activeDecadalIndex, setActiveDecadalIndex] = useState<number | null>(null)
  const [activeYear, setActiveYear] = useState<number | null>(null)
  const [timelineDisplayMode, setTimelineDisplayMode] = useState<'decade' | 'yearly'>('decade')
  const cloudCasesReady = useRef(false)
  const onboardingOfferedForToken = useRef<string | null>(null)

  const activeCase = casesState.find((item) => item.id === activeCaseId) ?? casesState[0] ?? null
  const workingCase = activeCase ?? defaultCase
  const deferredCase = useDeferredValue(workingCase)
  const timelineModel = useMemo(
    () => mode === 'bazi' ? buildBaziTimelineModel(deferredCase, 2026) : buildTimelineModel(deferredCase, 2026),
    [deferredCase, mode],
  )

  const visibleCases = useMemo(() => {
    const scoped =
      activeGroup === '全部' ? casesState : casesState.filter((item) => item.group === activeGroup)

    return scoped.map(buildCasePreview)
  }, [activeGroup, casesState])

  const activePreview = useMemo(() => activeCase ? buildCasePreview(activeCase) : null, [activeCase])
  const sihuaRisks = useMemo(() => buildSihuaRiskSummary(deferredCase), [deferredCase])
  const ziweiInsights = useMemo(() => buildZiweiDoushuInsights(deferredCase), [deferredCase])
  const chartModel = useMemo(() => buildChartModel(deferredCase), [deferredCase])
  const overallAnalysis = useMemo(() => buildOverallAnalysis(chartModel), [chartModel])
  const topicAnalyses = useMemo(() => buildTopicAnalyses(chartModel), [chartModel])
  const selectedPalaceResult = useMemo(
    () => buildPalaceResult(chartModel, selectedPalaceIndex),
    [chartModel, selectedPalaceIndex],
  )
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

  const agentContextMarkdown = useMemo(
    () =>
      buildAgentContextMarkdown({
        activeCase: deferredCase,
        mode,
        chartModel,
        overallAnalysis,
        topicAnalyses,
        selectedPalace: selectedPalaceResult,
        activeDecadal,
        activeTimelineYear,
        timelineDisplayMode,
        ziweiInsights,
        sihuaRisks,
      }),
    [
      deferredCase,
      mode,
      chartModel,
      overallAnalysis,
      topicAnalyses,
      selectedPalaceResult,
      activeDecadal,
      activeTimelineYear,
      timelineDisplayMode,
      ziweiInsights,
      sihuaRisks,
    ],
  )

  useEffect(() => {
    if (!accessToken) {
      cloudCasesReady.current = false
      return
    }

    let cancelled = false
    void loadCloudCases(accessToken)
      .then((cloudCases) => {
        if (cancelled) return
        const typedCases = cloudCases as CaseRecord[]
        setCasesState(typedCases)
        setActiveCaseId(typedCases[0]?.id ?? '')
        persistCases(typedCases)
        cloudCasesReady.current = true
        if (typedCases.length === 0 && onboardingOfferedForToken.current !== accessToken) {
          onboardingOfferedForToken.current = accessToken
          setIsFirstCaseOnboardingOpen(true)
        }
      })
      .catch(() => {
        if (cancelled) return
        clearAuthSession()
        setAuthUser(null)
        setAccessToken(null)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken])

  useEffect(() => {
    if (!accessToken || !cloudCasesReady.current) return
    const timeout = window.setTimeout(() => {
      void saveCloudCases(accessToken, casesState).catch(() => setSaveStatus('error'))
    }, 500)
    return () => window.clearTimeout(timeout)
  }, [accessToken, casesState])

  useEffect(() => {
    if (!activeTool) return
    const timeout = window.setTimeout(() => window.scrollTo({ top: 0 }), 80)
    return () => window.clearTimeout(timeout)
  }, [activeTool])

  function handleSetGroup(group: CaseGroupFilter) {
    setActiveGroup(group)

    if (group === '全部') return

    if (activeCase?.group === group) return

    const firstMatch = casesState.find((item) => item.group === group)
    if (firstMatch) {
      handleActivateCase(firstMatch.id)
    }
  }

  function handleActivateCase(caseId: string) {
    setActiveCaseId(caseId)
    setSelectedPalaceIndex(null)
    setActiveDecadalIndex(null)
    setActiveYear(null)
  }

  function handleActivateCaseFromLibrary(caseId: string) {
    handleActivateCase(caseId)
    setIsCaseLibraryOpen(false)
    window.scrollTo({ top: 0 })
  }

  function openCaseLibrary() {
    setIsCaseLibraryOpen(true)
    window.setTimeout(() => window.scrollTo({ top: 0 }), 0)
  }

  function handleUpdateCase(caseId: string, patch: Partial<CaseRecord>) {
    setCasesState((current) => {
      const next = current.map((item) => (item.id === caseId ? { ...item, ...patch } : item))
      persistCases(next)
      setSaveStatus('idle')
      return next
    })
  }

  function handleAddCase(input: NewCaseInput) {
    const birthTime = toTimeIndex(input.birthTimeText)
    const config = {
      birthday: input.birthday,
      birthTimeText: input.birthTimeText,
      birthTime,
      birthdayType: input.birthdayType,
      gender: input.gender,
      birthTimeSource: input.birthTimeSource ?? 'manual',
    }
    const newCase: CaseRecord = {
      id: `local-case-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...input,
      ...config,
      bazi: buildBaziPillars(config),
    }

    setCasesState((current) => {
      const next = [...current, newCase]
      persistCases(next)
      return next
    })
    setActiveGroup(newCase.group)
    handleActivateCase(newCase.id)
    setSaveStatus('saved')
  }

  async function handleSaveCases() {
    setSaveStatus('saving')
    persistCases(casesState)

    try {
      if (!accessToken) throw new Error('login_required')
      await saveCloudCases(accessToken, casesState)
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

  function handleChangeMode(nextMode: WorkspaceMode) {
    setMode(nextMode)
    setSelectedPalaceIndex(null)
    setActiveDecadalIndex(null)
    setActiveYear(null)
    setTimelineDisplayMode('decade')
  }

  function requireAnalysisLogin() {
    if (authUser && accessToken) return true
    setIsLoginOpen(true)
    return false
  }

  function handleLoginSuccess(nextAccessToken: string, user: AuthUser) {
    setAccessToken(nextAccessToken)
    setAuthUser(user)
    setIsLoginOpen(false)
  }

  function handleLogout() {
    clearAuthSession()
    cloudCasesReady.current = false
    setCasesState([])
    setActiveCaseId('')
    setAuthUser(null)
    setAccessToken(null)
  }

  function openTool(nextMode: WorkspaceMode) {
    setActiveTool(nextMode)
    handleChangeMode(nextMode)
    window.scrollTo({ top: 0 })
  }

  function closeTool() {
    setActiveTool(null)
    setMode('analysis')
    setSelectedPalaceIndex(null)
    window.scrollTo({ top: 0 })
  }

  const agentCase = activeCase && activePreview ? {
    id: activeCase.id,
    name: activeCase.name,
    solarLabel: activePreview.solarLabel,
    headerLabel: activePreview.headerLabel,
    solarHeaderLabel: activePreview.solarHeaderLabel,
    lunarHeaderLabel: activePreview.lunarHeaderLabel,
    zodiacIcon: activePreview.zodiacIcon,
  } : null

  return (
    <div className={`page-shell app-shell ${activeTool ? 'is-tool-open' : ''}`}>
      {activeTool && activeCase && activePreview ? (
        <>
          <div className="top-control-row tool-top-control-row">
            <button type="button" className="tool-home-button" onClick={closeTool} aria-label="返回首页">←</button>
            <CaseHeaderPanel
              open={isBrowserOpen}
              activeCaseId={activeCaseId}
              loadingCaseId={activeCase.id !== deferredCase.id ? activeCase.id : null}
              activeGroup={activeGroup}
              groups={caseGroups}
              activeCase={activePreview}
              visibleCases={visibleCases}
              isEditing={isCaseListEditing}
              saveStatus={saveStatus}
              onToggleOpen={() => setIsBrowserOpen((value) => !value)}
              onActivateCase={handleActivateCase}
              onSetGroup={handleSetGroup}
              onToggleEdit={() => setIsCaseListEditing((value) => !value)}
              onSaveCases={handleSaveCases}
              onUpdateCase={handleUpdateCase}
              onAddCase={handleAddCase}
            />
          </div>

          <main
            className={`workspace ${
              mode === 'circle' || mode === 'analysis' || mode === 'career' || (mode === 'sihua' && !selectedPalaceResult)
                ? 'workspace--single'
                : ''
            }`}
            data-slot="workspace"
          >
            <div className="workspace-main-column">
              <ChartStage
                config={deferredCase}
                mode={mode}
                onChangeMode={handleChangeMode}
                onEnterCharts={() => handleChangeMode('sanhe')}
                onBackToAnalysis={mode === 'career' || mode === 'analysis' ? closeTool : () => handleChangeMode('analysis')}
                selectedPalaceIndex={mode === 'sihua' || mode === 'circle' ? selectedPalaceIndex : null}
                onSelectPalace={setSelectedPalaceIndex}
                chartModel={chartModel}
                activeCaseId={activeCaseId}
                activeCaseName={activeCase.name}
                onRequireAnalysisLogin={requireAnalysisLogin}
                timelineOverlay={{
                  displayMode: timelineDisplayMode,
                  activeYear: resolvedYear,
                  decadalPalaceLabelsByPalace,
                  decadeYearLabelsByPalace,
                  yearlyPalaceLabelsByPalace,
                }}
              />
              {timelineModel && mode !== 'analysis' && mode !== 'career' ? (
                <TimelineToolbar
                  system={mode === 'bazi' ? 'bazi' : 'ziwei'}
                  decadalOptions={timelineModel.decadalOptions}
                  activeDecadalIndex={resolvedDecadalIndex}
                  activeYear={resolvedYear}
                  displayMode={timelineDisplayMode}
                  onSelectDecadal={handleSelectDecadal}
                  onSelectYear={handleSelectYear}
                />
              ) : null}
              {mode !== 'analysis' && mode !== 'career' && activeCaseId ? (
                <ChartBottomAnalysis
                  key={`${activeCaseId}-${mode === 'bazi' ? 'bazi' : 'ziwei'}`}
                  caseId={activeCaseId}
                  source={mode === 'bazi' ? 'bazi' : 'ziwei'}
                />
              ) : null}
            </div>

            {mode !== 'circle' && mode !== 'analysis' && mode !== 'career' && (mode !== 'sihua' || selectedPalaceResult) ? (
              <InsightSidebar
                mode={mode}
                risks={sihuaRisks}
                insights={ziweiInsights}
                overallAnalysis={mode === 'sihua' ? overallAnalysis : null}
                selectedPalace={mode === 'sihua' ? selectedPalaceResult : null}
                onBackToOverview={() => setSelectedPalaceIndex(null)}
              />
            ) : null}
          </main>
        </>
      ) : isCaseLibraryOpen ? (
        <CaseLibraryScreen
          cases={casesState}
          activeCaseId={activeCaseId}
          activeGroup={activeGroup}
          groups={caseGroups}
          onBack={() => setIsCaseLibraryOpen(false)}
          onSetGroup={handleSetGroup}
          onActivateCase={handleActivateCaseFromLibrary}
          onAddCase={() => setIsFirstCaseOnboardingOpen(true)}
        />
      ) : activeCase && activePreview && agentCase ? (
        <>
          {activeTab === 'home' ? (
            <AppHome caseName={activeCase.name} onOpenTool={openTool} onOpenCases={openCaseLibrary} />
          ) : null}
          {activeTab === 'explore' ? (
            <main className="explore-screen">
              <header className="screen-heading">
                <p className="section-kicker">Explore</p>
                <h1>和你的方向助手聊聊</h1>
                <p>探索命盘、职业方向、当前目标，或者反驳任何你认为不准确的判断。</p>
              </header>
              <AgentTalkBar embedded contextMarkdown={agentContextMarkdown} activeCase={agentCase} onActivateCase={handleActivateCase} />
            </main>
          ) : null}
          {activeTab === 'profile' ? (
            <ProfileScreen
              user={authUser}
              caseName={activeCase.name}
              caseCount={casesState.length}
              onLogin={() => setIsLoginOpen(true)}
              onLogout={handleLogout}
              onOpenCases={openCaseLibrary}
            />
          ) : null}
          <BottomNavigation active={activeTab} onChange={setActiveTab} />
        </>
      ) : (
        <main className="account-empty-state">
          <div>
            <p className="section-kicker">Start Here</p>
            <h1>先建立你的第一份人生档案</h1>
            <p>提供出生资料后，我们会从认识自己开始，逐步形成职业方向与行动建议。</p>
            <button type="button" onClick={() => setIsFirstCaseOnboardingOpen(true)}>开始建立档案</button>
          </div>
        </main>
      )}
      <FirstCaseOnboarding
        open={isFirstCaseOnboardingOpen}
        onClose={() => setIsFirstCaseOnboardingOpen(false)}
        onComplete={handleAddCase}
      />
      <LoginDialog open={isLoginOpen} onClose={() => setIsLoginOpen(false)} onSuccess={handleLoginSuccess} />
    </div>
  )
}

export default App
