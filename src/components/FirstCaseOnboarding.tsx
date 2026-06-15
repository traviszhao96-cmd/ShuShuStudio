import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Clock3, Search, Sparkles, X } from 'lucide-react'
import type { CalendarType, GenderType, NewCaseInput } from '../types'

type FirstCaseOnboardingProps = {
  open: boolean
  onClose: () => void
  onComplete: (input: NewCaseInput) => void
}

type WheelColumnProps = {
  label: string
  value: number
  values: number[]
  suffix: string
  onChange: (value: number) => void
}

function WheelColumn({ label, value, values, suffix, onChange }: WheelColumnProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const currentIndexRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const repeatedValues = useMemo(
    () => Array.from({ length: 7 }, () => values).flat(),
    [values],
  )

  useEffect(() => {
    const track = trackRef.current
    if (!track || values.length === 0) return

    const currentIndex = currentIndexRef.current
    if (currentIndex !== null && repeatedValues[currentIndex] === value) return

    const valueIndex = Math.max(0, values.indexOf(value))
    const centeredIndex = values.length * 3 + valueIndex
    currentIndexRef.current = centeredIndex
    setActiveIndex(centeredIndex)
    track.scrollTop = centeredIndex * 50
  }, [repeatedValues, value, values])

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
  }, [])

  function handleScroll() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      const track = trackRef.current
      if (!track || values.length === 0) return

      let index = Math.round(track.scrollTop / 50)
      const valueIndex = ((index % values.length) + values.length) % values.length
      const nextValue = values[valueIndex]

      if (index < values.length || index >= values.length * 6) {
        index = values.length * 3 + valueIndex
        track.scrollTop = index * 50
      }

      currentIndexRef.current = index
      setActiveIndex(index)
      if (nextValue !== value) onChange(nextValue)
    })
  }

  function selectItem(item: number, index: number) {
    currentIndexRef.current = index
    setActiveIndex(index)
    onChange(item)
    trackRef.current?.scrollTo({ top: index * 50, behavior: 'smooth' })
  }

  return (
    <div className="onboarding-wheel-column" aria-label={label}>
      <span>{label}</span>
      <div className="onboarding-wheel-track" ref={trackRef} onScroll={handleScroll}>
        {repeatedValues.map((item, index) => (
          <button
            key={`${index}-${item}`}
            type="button"
            className={index === activeIndex ? 'is-selected' : ''}
            onClick={() => selectItem(item, index)}
          >
            {suffix === '分' ? pad(item) : item}{suffix}
          </button>
        ))}
      </div>
    </div>
  )
}

const years = Array.from({ length: 101 }, (_, index) => new Date().getFullYear() - index)
const months = Array.from({ length: 12 }, (_, index) => index + 1)
const hours = Array.from({ length: 24 }, (_, index) => index)
const minutes = Array.from({ length: 60 }, (_, index) => index)

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function getSolarDays(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

export function FirstCaseOnboarding({ open, onClose, onComplete }: FirstCaseOnboardingProps) {
  const now = new Date()
  const [step, setStep] = useState(0)
  const [calendarType, setCalendarType] = useState<CalendarType>('solar')
  const [year, setYear] = useState(now.getFullYear() - 25)
  const [month, setMonth] = useState(1)
  const [day, setDay] = useState(1)
  const [hour, setHour] = useState(12)
  const [minute, setMinute] = useState(0)
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [name, setName] = useState('我自己')
  const [gender, setGender] = useState<GenderType>('female')

  const dayValues = useMemo(() => {
    const count = calendarType === 'lunar' ? 30 : getSolarDays(year, month)
    return Array.from({ length: count }, (_, index) => index + 1)
  }, [calendarType, month, year])
  const selectedDay = Math.min(day, dayValues.length)
  const birthday = `${year}-${pad(month)}-${pad(selectedDay)}`
  const birthTimeText = timeUnknown ? '未知' : `${pad(hour)}:${pad(minute)}`

  if (!open) return null

  function finish() {
    onComplete({
      name: name.trim() || '我自己',
      group: '家人',
      note: timeUnknown ? '出生具体时间暂不清楚，建议后续进行时间矫正。' : '',
      birthday,
      birthTimeText,
      birthdayType: calendarType,
      gender,
      birthTimeSource: timeUnknown ? 'placeholder' : 'manual',
    })
    onClose()
  }

  return (
    <div className="first-case-onboarding" role="dialog" aria-modal="true" aria-label="首次命例引导">
      <header className="onboarding-topbar">
        <span>易思</span>
        <div className="onboarding-progress" aria-label={`第 ${step + 1} 步，共 4 步`}>
          {[0, 1, 2, 3].map((item) => <i key={item} className={item <= step ? 'is-active' : ''} />)}
        </div>
        <button type="button" onClick={onClose} aria-label="稍后填写"><X size={18} /></button>
      </header>

      <main className="onboarding-stage">
        {step === 0 ? (
          <section className="onboarding-welcome">
            <span className="onboarding-mark"><Sparkles size={28} /></span>
            <p className="section-kicker">Welcome to Fate-ish</p>
            <h1>在开始之前，<br />请告诉我一些必要的信息</h1>
            <p>我们会先建立你的第一份命例。出生信息只用于排盘，并保存在你的账号中。</p>
            <button type="button" className="onboarding-primary" onClick={() => setStep(1)}>
              开始填写 <ArrowRight size={17} />
            </button>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="onboarding-content">
            <p className="section-kicker">Step 1 · 出生日期</p>
            <h2>你的生日是哪一天？</h2>
            <div className="onboarding-segmented" role="group" aria-label="历法">
              <button type="button" className={calendarType === 'solar' ? 'is-active' : ''} onClick={() => setCalendarType('solar')}>阳历</button>
              <button type="button" className={calendarType === 'lunar' ? 'is-active' : ''} onClick={() => setCalendarType('lunar')}>阴历</button>
            </div>
            <div className="onboarding-wheel">
              <WheelColumn label="年份" value={year} values={years} suffix="年" onChange={setYear} />
              <WheelColumn label="月份" value={month} values={months} suffix="月" onChange={setMonth} />
              <WheelColumn label="日期" value={selectedDay} values={dayValues} suffix="日" onChange={setDay} />
            </div>
            <p className="onboarding-selection">{calendarType === 'solar' ? '阳历' : '阴历'} · {year} 年 {month} 月 {selectedDay} 日</p>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="onboarding-content">
            <p className="section-kicker">Step 2 · 出生时间</p>
            <h2>你大概是什么时间出生的？</h2>
            <div className={`onboarding-wheel onboarding-time-wheel ${timeUnknown ? 'is-disabled' : ''}`}>
              <WheelColumn label="小时" value={hour} values={hours} suffix="时" onChange={(value) => { setHour(value); setTimeUnknown(false) }} />
              <WheelColumn label="分钟" value={minute} values={minutes} suffix="分" onChange={(value) => { setMinute(value); setTimeUnknown(false) }} />
            </div>
            <button type="button" className={`onboarding-unknown ${timeUnknown ? 'is-active' : ''}`} onClick={() => setTimeUnknown((value) => !value)}>
              <Clock3 size={18} />
              <span><strong>完全不清楚</strong><small>先将出生时间标记为未知</small></span>
              {timeUnknown ? <Check size={17} /> : null}
            </button>
            <aside className="onboarding-time-note">
              <strong>具体时间会影响命盘准确度</strong>
              <p>建议问问母亲或家人，也可以查询出生证。若仍无法确定，可以先继续，之后使用时间矫正功能。</p>
              <span><Search size={15} /> 时间矫正将支持参考父母、兄弟姐妹与配偶的生肖</span>
            </aside>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="onboarding-content">
            <p className="section-kicker">Step 3 · 确认资料</p>
            <h2>最后，怎么称呼这份命例？</h2>
            <label className="onboarding-field">
              <span>称呼</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：我自己" autoFocus />
            </label>
            <div className="onboarding-segmented onboarding-gender" role="group" aria-label="性别">
              <button type="button" className={gender === 'female' ? 'is-active' : ''} onClick={() => setGender('female')}>女</button>
              <button type="button" className={gender === 'male' ? 'is-active' : ''} onClick={() => setGender('male')}>男</button>
            </div>
            <dl className="onboarding-summary">
              <div><dt>出生日期</dt><dd>{calendarType === 'solar' ? '阳历' : '阴历'} {birthday}</dd></div>
              <div><dt>出生时间</dt><dd>{timeUnknown ? '未知，稍后可以矫正' : birthTimeText}</dd></div>
            </dl>
          </section>
        ) : null}
      </main>

      {step > 0 ? (
        <footer className="onboarding-actions">
          <button type="button" className="onboarding-back" onClick={() => setStep((value) => value - 1)}><ArrowLeft size={17} /> 返回</button>
          <button type="button" className="onboarding-primary" onClick={() => step === 3 ? finish() : setStep((value) => value + 1)}>
            {step === 3 ? '创建我的命例' : timeUnknown && step === 2 ? '以未知时间继续' : '下一步'} <ArrowRight size={17} />
          </button>
        </footer>
      ) : null}
    </div>
  )
}
