import type { TimelineDecadalOption } from '../types'

type TimelineToolbarProps = {
  system?: 'ziwei' | 'bazi'
  decadalOptions: TimelineDecadalOption[]
  activeDecadalIndex: number
  activeYear: number
  displayMode: 'decade' | 'yearly'
  onSelectDecadal: (decadalIndex: number) => void
  onSelectYear: (year: number) => void
}

export function TimelineToolbar({
  system = 'ziwei',
  decadalOptions,
  activeDecadalIndex,
  activeYear,
  displayMode,
  onSelectDecadal,
  onSelectYear,
}: TimelineToolbarProps) {
  const activeDecadal =
    decadalOptions.find((item) => item.palaceIndex === activeDecadalIndex) ?? decadalOptions[0]

  return (
    <section className="timeline-toolbar" data-slot="timeline-toolbar" aria-label={`${system === 'bazi' ? '大运' : '大限'}与流年选择`}>
      <div className="timeline-stack">
        <div className="timeline-row">
          <span className="timeline-row-label">{system === 'bazi' ? '大运' : '大限'}</span>
          <div className="timeline-chip-rail">
            {decadalOptions.map((item) => (
              <button
                key={item.palaceIndex}
                type="button"
                className={`timeline-chip ${activeDecadalIndex === item.palaceIndex ? 'is-active' : ''}`}
                onClick={() => onSelectDecadal(item.palaceIndex)}
                aria-label={`${item.startAge}至${item.endAge}岁 ${item.heavenlyStem}${item.earthlyBranch}${system === 'bazi' ? '运' : '限'}`}
              >
                <strong>
                  {item.startAge}~{item.endAge}
                </strong>
                <span>
                  {item.heavenlyStem}
                  {item.earthlyBranch}{system === 'bazi' ? '运' : '限'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {activeDecadal ? (
          <div className="timeline-row">
            <span className="timeline-row-label">流年</span>
            <div className="timeline-chip-rail">
              {activeDecadal.years.map((item) => (
                <button
                  key={item.year}
                  type="button"
                  className={`timeline-chip timeline-chip--year ${
                    displayMode === 'yearly' && activeYear === item.year ? 'is-active' : ''
                  }`}
                  onClick={() => onSelectYear(item.year)}
                  aria-label={`${item.year}年 ${item.nominalAge}岁`}
                >
                  <strong>{item.year}</strong>
                  <span>{item.nominalAge}岁</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
