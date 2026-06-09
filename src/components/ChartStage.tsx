import type { ReactNode } from 'react'
import { Iztrolabe } from 'react-iztro'
import type { TopicResult } from '../analysis/types'
import type { ChartConfig, WorkspaceMode } from '../types'
import { AnalysisTopics } from './AnalysisTopics'
import { BaziChart } from './BaziChart'
import { CircularAstrolabe } from './CircularAstrolabe'
import { SihuaAstrolabe } from './SihuaAstrolabe'

type TimelineOverlay = {
  displayMode: 'decade' | 'yearly'
  activeYear: number
  decadalPalaceLabelsByPalace: Map<number, string>
  decadeYearLabelsByPalace: Map<number, string>
  yearlyPalaceLabelsByPalace: Map<number, string>
}

type ChartStageProps = {
  config: ChartConfig
  mode: WorkspaceMode
  onChangeMode: (mode: WorkspaceMode) => void
  onEnterCharts: () => void
  onBackToAnalysis: () => void
  headerRight?: ReactNode
  timelineOverlay?: TimelineOverlay
  selectedPalaceIndex?: number | null
  onSelectPalace?: (palaceIndex: number) => void
  topicAnalyses?: TopicResult[]
}

const modeItems: Array<{ value: Exclude<WorkspaceMode, 'analysis'>; label: string }> = [
  { value: 'sanhe', label: '三合' },
  { value: 'sihua', label: '四化' },
  { value: 'circle', label: '圆盘' },
  { value: 'bazi', label: '八字' },
]

export function ChartStage({
  config,
  mode,
  onChangeMode,
  onEnterCharts,
  onBackToAnalysis,
  headerRight,
  timelineOverlay,
  selectedPalaceIndex = null,
  onSelectPalace,
  topicAnalyses = [],
}: ChartStageProps) {
  return (
    <section className="chart-stage" data-slot="chart-stage">
      <div className="panel-heading" data-slot="chart-header">
        <div className="chart-heading-main" data-slot="chart-header-left">
          {mode !== 'analysis' ? (
            <button type="button" className="chart-back-button" onClick={onBackToAnalysis} aria-label="返回分析">
              <span aria-hidden="true">←</span>
            </button>
          ) : null}
          <div>
          <p className="section-kicker">Live Astrolabe</p>
          <h2>
            {mode === 'analysis'
              ? '分析报告'
              : mode === 'sanhe'
                ? '三合舞台'
                : mode === 'sihua'
                  ? '四化舞台'
                  : mode === 'circle'
                    ? '圆盘四化'
                    : '八字舞台'}
          </h2>
          </div>
        </div>

        <div className="chart-header-actions">
          {mode === 'analysis' ? (
            <button type="button" className="enter-chart-button" onClick={onEnterCharts}>
              命盘
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <div className="chart-mode-tabs" data-slot="chart-mode-tabs">
              {modeItems.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`chart-mode-tab ${mode === item.value ? 'is-active' : ''}`}
                  onClick={() => onChangeMode(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {headerRight}
        </div>
      </div>

      {mode === 'analysis' ? (
        <AnalysisTopics topics={topicAnalyses} />
      ) : mode === 'sanhe' ? (
        <div className="chart-frame chart-frame--sanhe" data-slot="chart-canvas">
          <div className="sanhe-chart-scroll">
            <div className="sanhe-chart-square">
              <Iztrolabe
                birthday={config.birthday}
                birthTime={config.birthTime}
                birthdayType={config.birthdayType}
                gender={config.gender}
                centerPalaceAlign
                horoscopeDate={new Date(`${timelineOverlay?.activeYear ?? 2026}-06-01T12:00:00`)}
                horoscopeHour={config.birthTime}
              />
            </div>
          </div>
        </div>
      ) : mode === 'sihua' ? (
        <div className="chart-frame chart-frame--sihua" data-slot="chart-canvas">
          <div className="chart-mode-note">
            <p className="section-kicker">Sihua Focus</p>
            <p>
              这里是四化专用命盘。鼠标停留宫位即可查看该宫天干四化，并用禄绿、权紫、科蓝、忌红高亮对应因化落点；
              星曜旁短线看离心，对宫射入的长线看向心。
            </p>
          </div>
          <SihuaAstrolabe
            key={`${config.birthday}-${config.birthTime}-${config.birthdayType}-${config.gender}`}
            config={config}
            timelineOverlay={timelineOverlay}
            selectedPalaceIndex={selectedPalaceIndex}
            onSelectPalace={onSelectPalace}
          />
        </div>
      ) : mode === 'circle' ? (
        <div className="chart-frame chart-frame--circular" data-slot="chart-canvas">
          <div className="chart-mode-note">
            <p className="section-kicker">Circular Focus</p>
            <p>十二宫沿圆周展开，点选宫位查看三方四正；生年四化与向心、离心自化共同显示在圆盘中。</p>
          </div>
          <CircularAstrolabe
            key={`${config.birthday}-${config.birthTime}-${config.birthdayType}-${config.gender}`}
            config={config}
            timelineOverlay={timelineOverlay}
            selectedPalaceIndex={selectedPalaceIndex}
            onSelectPalace={onSelectPalace}
          />
        </div>
      ) : (
        <div className="analysis-stage bazi-stage" data-slot="chart-canvas">
          <BaziChart config={config} />
        </div>
      )}
    </section>
  )
}
