import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { LoginDialog } from './components/LoginDialog'
import { FirstCaseOnboarding } from './components/FirstCaseOnboarding'
import { TimelineToolbar } from './components/TimelineToolbar'
import { AppHome } from './components/AppHome'
import { BottomNavigation, type AppTab } from './components/BottomNavigation'
import { ProfileScreen } from './components/ProfileScreen'
import { CaseLibraryScreen } from './components/CaseLibraryScreen'
import { CaseSwitchButton } from './components/CaseSwitchButton'
import { buildProfileOnlyAgentContextMarkdown } from './agent/contextMarkdown'
import { getLatestReport } from './agent/reportStore'
import { buildChartModel } from './analysis/chartModel'
import { buildOverallAnalysis } from './analysis/overallAnalysis'
import { buildPalaceResult } from './analysis/palaceAnalysis'
import { hashChartModel } from './analysis/patternAnalysis'
import { getProfile } from './analysis/profileStore'
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

const chartModeItems: Array<{ value: Exclude<WorkspaceMode, 'analysis' | 'career'>; label: string }> = [
  { value: 'sanhe', label: '三合' },
  { value: 'sihua', label: '四化' },
  { value: 'circle', label: '圆盘' },
  { value: 'bazi', label: '八字' },
]

const ChartStage = lazy(() => import('./components/ChartStage').then((module) => ({ default: module.ChartStage })))
const ChartBottomAnalysis = lazy(() => import('./components/ChartStage').then((module) => ({ default: module.ChartBottomAnalysis })))
const AgentTalkBar = lazy(() => import('./components/AgentTalkBar').then((module) => ({ default: module.AgentTalkBar })))
const InsightSidebar = lazy(() => import('./components/InsightSidebar').then((module) => ({ default: module.InsightSidebar })))
const PatternOverview = lazy(() => import('./components/PatternOverview').then((module) => ({ default: module.PatternOverview })))

function LazyFallback() {
  return <div className="lazy-screen-fallback" aria-live="polite">加载中…</div>
}

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
  const [mode, setMode] = useState<WorkspaceMode>('analysis')
  const [selectedPalaceIndex, setSelectedPalaceIndex] = useState<number | null>(null)
  const [activeDecadalIndex, setActiveDecadalIndex] = useState<number | null>(null)
  const [activeYear, setActiveYear] = useState<number | null>(null)
  const [timelineDisplayMode, setTimelineDisplayMode] = useState<'decade' | 'yearly'>('decade')
  const [pendingExploreQuestion, setPendingExploreQuestion] = useState<{ id: string; question: string } | null>(null)
  const cloudCasesReady = useRef(false)
  const onboardingOfferedForToken = useRef<string | null>(null)

  const activeCase = casesState.find((item) => item.id === activeCaseId) ?? casesState[0] ?? null
  const workingCase = activeCase ?? defaultCase
  const deferredCase = useDeferredValue(workingCase)
  const isToolOpen = Boolean(activeTool)
  const isChartModeOpen = isToolOpen && mode !== 'analysis' && mode !== 'career'
  const needsChartModel = isToolOpen || activeTab === 'explore'
  const timelineModel = useMemo(
    () => {
      if (!isChartModeOpen) return null
      return mode === 'bazi' ? buildBaziTimelineModel(deferredCase, 2026) : buildTimelineModel(deferredCase, 2026)
    },
    [deferredCase, isChartModeOpen, mode],
  )

  const activePreview = useMemo(() => activeCase ? buildCasePreview(activeCase) : null, [activeCase])
  const sihuaRisks = useMemo(() => isChartModeOpen ? buildSihuaRiskSummary(deferredCase) : [], [deferredCase, isChartModeOpen])
  const ziweiInsights = useMemo(() => isChartModeOpen ? buildZiweiDoushuInsights(deferredCase) : null, [deferredCase, isChartModeOpen])
  const chartModel = useMemo(() => needsChartModel ? buildChartModel(deferredCase) : null, [deferredCase, needsChartModel])

  const overallAnalysis = useMemo(() => (isChartModeOpen || mode === 'career') ? buildOverallAnalysis(chartModel) : null, [chartModel, isChartModeOpen, mode])
  const selectedPalaceResult = useMemo(
    () => mode === 'sihua' || mode === 'circle' ? buildPalaceResult(chartModel, selectedPalaceIndex) : null,
    [chartModel, mode, selectedPalaceIndex],
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

  const exploreContextMarkdown = useMemo(() => {
    if (activeTab !== 'explore') return ''

    const profile = activeCaseId ? getProfile(activeCaseId) : null
    const report = activeCaseId ? getLatestReport(activeCaseId) : null
    const profileStatus = profile
      ? chartModel && profile.chartModelHash === hashChartModel(chartModel) ? 'ready' : 'stale'
      : 'missing'

    return buildProfileOnlyAgentContextMarkdown({
      activeCase: deferredCase,
      profile,
      report,
      profileStatus,
    })
  }, [activeCaseId, activeTab, chartModel, deferredCase])

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
      void saveCloudCases(accessToken, casesState).catch(() => undefined)
    }, 500)
    return () => window.clearTimeout(timeout)
  }, [accessToken, casesState])

  useEffect(() => {
    if (!activeTool) return
    const timeout = window.setTimeout(() => window.scrollTo({ top: 0 }), 80)
    return () => window.clearTimeout(timeout)
  }, [activeTool])

  useEffect(() => {
    if (activeTool || isCaseLibraryOpen) return
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0 })
    })
    const timeout = window.setTimeout(() => window.scrollTo({ top: 0 }), 120)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
    }
  }, [activeTab, activeTool, isCaseLibraryOpen])

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
      lifeFacts: [],
      bazi: buildBaziPillars(config),
    }

    setCasesState((current) => {
      const next = [...current, newCase]
      persistCases(next)
      return next
    })
    setActiveGroup(newCase.group)
    handleActivateCase(newCase.id)
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

  function handleChangeTab(nextTab: AppTab) {
    setActiveTab(nextTab)
    setActiveTool(null)
    setMode('analysis')
    setSelectedPalaceIndex(null)
    setIsCaseLibraryOpen(false)
    window.scrollTo({ top: 0 })
  }

  function handleAskExplore(question: string) {
    const normalized = question.trim()
    if (!normalized) return
    setPendingExploreQuestion({ id: `explore-question-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, question: normalized })
    setActiveTab('explore')
    setActiveTool(null)
    setMode('analysis')
    setSelectedPalaceIndex(null)
    setIsCaseLibraryOpen(false)
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
    <div className={`page-shell app-shell ${activeTool && !isCaseLibraryOpen ? 'is-tool-open' : ''}`}>
      <Suspense fallback={<LazyFallback />}>
        {isCaseLibraryOpen ? (
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
        ) : activeTool && activeCase && activePreview ? (
          <>
            <div className="top-control-row tool-top-control-row">
              <button type="button" className="tool-home-button" onClick={closeTool} aria-label="返回首页">←</button>
              {mode !== 'analysis' && mode !== 'career' ? (
                <div className="chart-mode-tabs tool-mode-tabs" data-slot="tool-mode-tabs">
                  {chartModeItems.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`chart-mode-tab ${mode === item.value ? 'is-active' : ''}`}
                      onClick={() => handleChangeMode(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : mode === 'career' ? (
                <strong className="tool-top-title">{activeCase.name} 的命运牌组</strong>
              ) : (
                <span className="tool-top-spacer" />
              )}
              <CaseSwitchButton caseName={activeCase.name} gender={activeCase.gender} onClick={openCaseLibrary} showName />
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
                  onBackToAnalysis={mode === 'career' || mode === 'analysis' ? closeTool : () => handleChangeMode('analysis')}
                  selectedPalaceIndex={mode === 'sihua' || mode === 'circle' ? selectedPalaceIndex : null}
                  onSelectPalace={setSelectedPalaceIndex}
                  chartModel={chartModel}
                  overallAnalysis={overallAnalysis}
                  activeCaseId={activeCaseId}
                  activeCaseName={activeCase.name}
                  onRequireAnalysisLogin={requireAnalysisLogin}
                  showHeader={mode === 'analysis'}
                  onAskExplore={handleAskExplore}
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
                {mode !== 'analysis' && mode !== 'career' ? (
                  <PatternOverview overall={overallAnalysis} />
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
        ) : activeCase && activePreview && agentCase ? (
          <>
            {activeTab === 'home' ? (
              <AppHome caseName={activeCase.name} caseGender={activeCase.gender} onOpenTool={openTool} onOpenCases={openCaseLibrary} />
            ) : null}
            {activeTab === 'explore' ? (
              <main className="explore-screen">
                <header className="home-topbar explore-topbar">
                  <div>
                    <p className="section-kicker">Explore</p>
                    <strong>和方向助手聊聊</strong>
                  </div>
                  <CaseSwitchButton caseName={activeCase.name} gender={activeCase.gender} onClick={openCaseLibrary} showName />
                </header>
                <AgentTalkBar
                  embedded
                  contextMarkdown={exploreContextMarkdown}
                  activeCase={agentCase}
                  onActivateCase={handleActivateCase}
                  autoSendQuestion={pendingExploreQuestion}
                  modelOverride="deepseek-v4-flash"
                  contextLabel="命理档案层"
                />
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
        {activeCase && activePreview && agentCase && !isCaseLibraryOpen ? (
          <BottomNavigation active={activeTab} onChange={handleChangeTab} />
        ) : null}
      </Suspense>
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
