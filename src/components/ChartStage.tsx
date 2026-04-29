import type { ReactNode } from 'react'
import { Iztrolabe } from 'react-iztro'
import type { ChartConfig, WorkspaceMode } from '../types'
import { SihuaAstrolabe } from './SihuaAstrolabe'

type ChartStageProps = {
  config: ChartConfig
  mode: WorkspaceMode
  onChangeMode: (mode: WorkspaceMode) => void
  headerRight?: ReactNode
}

const modeItems: Array<{ value: WorkspaceMode; label: string }> = [
  { value: 'sanhe', label: '三合' },
  { value: 'sihua', label: '四化' },
  { value: 'bazi', label: '八字' },
]

export function ChartStage({ config, mode, onChangeMode, headerRight }: ChartStageProps) {
  return (
    <section className="chart-stage" data-slot="chart-stage">
      <div className="panel-heading" data-slot="chart-header">
        <div className="chart-heading-main" data-slot="chart-header-left">
          <p className="section-kicker">Live Astrolabe</p>
          <h2>{mode === 'sanhe' ? '三合舞台' : mode === 'sihua' ? '四化舞台' : '八字舞台'}</h2>
        </div>

        <div className="chart-header-actions">
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

          {headerRight}
        </div>
      </div>

      {mode === 'sanhe' ? (
        <div className="chart-frame" data-slot="chart-canvas">
          <Iztrolabe
            birthday={config.birthday}
            birthTime={config.birthTime}
            birthdayType={config.birthdayType}
            gender={config.gender}
            centerPalaceAlign
            horoscopeDate={new Date()}
            horoscopeHour={config.birthTime}
          />
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
          />
        </div>
      ) : (
        <div className="analysis-stage bazi-stage" data-slot="chart-canvas">
          <div className="analysis-stage-copy">
            <p className="section-kicker">Bazi Focus</p>
            <h3>八字排盘区</h3>
            <p>
              这里现在优先承接命例已存的四柱数据。后面会继续往十神、格局、大运流转，
              以及与紫微结果的对照摘要扩展。
            </p>
          </div>

          <div className="bazi-pillars">
            <article>
              <span>年柱</span>
              <strong>{config.bazi?.yearPillar ?? '待补录'}</strong>
            </article>
            <article>
              <span>月柱</span>
              <strong>{config.bazi?.monthPillar ?? '待补录'}</strong>
            </article>
            <article>
              <span>日柱</span>
              <strong>{config.bazi?.dayPillar ?? '待补录'}</strong>
            </article>
            <article>
              <span>时柱</span>
              <strong>{config.bazi?.hourPillar ?? '时柱缺失'}</strong>
            </article>
          </div>

          <div className="analysis-stage-grid">
            <article>
              <strong>排盘依据</strong>
              <p>
                {config.birthTimeSource === 'bazi_match'
                  ? '当前时辰已按截图八字与公历日期精确匹配。'
                  : config.birthTimeSource === 'bazi_branch'
                    ? '当前时辰按时柱折算到对应时辰，后续还可继续细化。'
                    : '当前时辰仍是占位值，后续需要补齐完整时柱或手工校时。'}
              </p>
            </article>
            <article>
              <strong>当前时辰</strong>
              <p>
                {config.birthTimeText} ·{' '}
                {config.birthTimeSource === 'placeholder' ? '占位' : '来自八字'}
              </p>
            </article>
            <article>
              <strong>下一步</strong>
              <p>后面这里会接八字直输入口，以及八字反推紫微排盘的工作流。</p>
            </article>
          </div>
        </div>
      )}
    </section>
  )
}
