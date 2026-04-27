import type { ReactNode } from 'react'
import { Iztrolabe } from 'react-iztro'
import type { ChartConfig } from '../types'

type ChartStageProps = {
  config: ChartConfig
  headerRight?: ReactNode
}

export function ChartStage({ config, headerRight }: ChartStageProps) {
  return (
    <section className="chart-stage" data-slot="chart-stage">
      <div className="panel-heading" data-slot="chart-header">
        <div data-slot="chart-header-left">
          <p className="section-kicker">Live Astrolabe</p>
          <h2>命盘舞台</h2>
        </div>

        {headerRight}
      </div>

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
    </section>
  )
}
