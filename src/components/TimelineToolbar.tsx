import type { TimelineDecadalOption } from '../types'

type TimelineToolbarProps = {
  decadalOptions: TimelineDecadalOption[]
  activeDecadalIndex: number
  activeYear: number
  displayMode: 'decade' | 'yearly'
  onSelectDecadal: (decadalIndex: number) => void
  onSelectYear: (year: number) => void
}

export function TimelineToolbar({
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
    <section className="timeline-toolbar" data-slot="timeline-toolbar">
      <div className="timeline-summary">
        <p className="section-kicker">Timeline Controls</p>
        <h2>大运与流年</h2>
      </div>

      <div className="timeline-stack">
        <div className="timeline-row">
          <span className="timeline-row-label">大限</span>
          <div className="timeline-chip-rail">
            {decadalOptions.map((item) => (
              <button
                key={item.palaceIndex}
                type="button"
                className={`timeline-chip ${activeDecadalIndex === item.palaceIndex ? 'is-active' : ''}`}
                onClick={() => onSelectDecadal(item.palaceIndex)}
              >
                <strong>
                  {item.startAge}~{item.endAge}
                </strong>
                <span>
                  {item.heavenlyStem}
                  {item.earthlyBranch}限
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
