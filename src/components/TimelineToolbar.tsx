type TimelineToolbarProps = {
  activeScope: '大限' | '流年' | '流月' | '流日'
  activeYear: number
  onSetScope: (scope: '大限' | '流年' | '流月' | '流日') => void
  onShiftYear: (delta: number) => void
}

const scopeItems: Array<'大限' | '流年' | '流月' | '流日'> = ['大限', '流年', '流月', '流日']

export function TimelineToolbar({
  activeScope,
  activeYear,
  onSetScope,
  onShiftYear,
}: TimelineToolbarProps) {
  return (
    <section className="timeline-toolbar" data-slot="timeline-toolbar">
      <div className="timeline-summary">
        <p className="section-kicker">Timeline Controls</p>
        <h2>时间引动</h2>
      </div>

      <div className="timeline-controls">
        <div className="scope-switcher">
          {scopeItems.map((scope) => (
            <button
              key={scope}
              type="button"
              className={`scope-chip ${activeScope === scope ? 'is-active' : ''}`}
              onClick={() => onSetScope(scope)}
            >
              {scope}
            </button>
          ))}
        </div>

        <div className="year-switcher">
          <button type="button" className="year-step" onClick={() => onShiftYear(-1)}>
            上一年
          </button>
          <div className="year-pill">{activeYear}</div>
          <button type="button" className="year-step" onClick={() => onShiftYear(1)}>
            下一年
          </button>
        </div>
      </div>
    </section>
  )
}
