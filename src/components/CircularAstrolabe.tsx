import { useMemo, useState } from 'react'
import { useIztro } from 'iztro-hook'
import { getMutagensByHeavenlyStem } from 'iztro/lib/utils'
import type { ChartConfig } from '../types'

type TimelineOverlay = {
  displayMode: 'decade' | 'yearly'
  activeYear: number
  decadalPalaceLabelsByPalace: Map<number, string>
  decadeYearLabelsByPalace: Map<number, string>
  yearlyPalaceLabelsByPalace: Map<number, string>
}

type CircularAstrolabeProps = {
  config: ChartConfig
  userName: string
  selectedPalaceIndex?: number | null
  onSelectPalace?: (palaceIndex: number) => void
  timelineOverlay?: TimelineOverlay
}

type PalaceStar = {
  name: string
  brightness?: string
  mutagen?: string
}

type PalaceWithStars = {
  index: number
  name: string
  heavenlyStem: string
  earthlyBranch: string
  isBodyPalace?: boolean
  isOriginalPalace?: boolean
  selfMutaged?: (withMutagens: MutagenType | MutagenType[]) => boolean
  majorStars: PalaceStar[]
  minorStars: PalaceStar[]
  adjectiveStars: PalaceStar[]
}

const CENTER = 50
const OUTER_RADIUS = 47
const INNER_RADIUS = 23
const LABEL_RADIUS = 35.8
const SELF_LINE_INNER_RADIUS = 24.8
const SELF_LINE_OUTER_RADIUS = 45.7
const MUTAGEN_ORDER = ['禄', '权', '科', '忌'] as const

type MutagenType = (typeof MUTAGEN_ORDER)[number]

function polarToCartesian(radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180

  return {
    x: CENTER + radius * Math.cos(radians),
    y: CENTER + radius * Math.sin(radians),
  }
}

function describeArc(radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(radius, endAngle)
  const end = polarToCartesian(radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

  return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x.toFixed(
    3,
  )} ${end.y.toFixed(3)}`
}

function describeSector(startAngle: number, endAngle: number) {
  const outerStart = polarToCartesian(OUTER_RADIUS, endAngle)
  const outerEnd = polarToCartesian(OUTER_RADIUS, startAngle)
  const innerStart = polarToCartesian(INNER_RADIUS, startAngle)
  const innerEnd = polarToCartesian(INNER_RADIUS, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

  return [
    `M ${outerStart.x.toFixed(3)} ${outerStart.y.toFixed(3)}`,
    `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArcFlag} 0 ${outerEnd.x.toFixed(3)} ${outerEnd.y.toFixed(3)}`,
    `L ${innerStart.x.toFixed(3)} ${innerStart.y.toFixed(3)}`,
    `A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArcFlag} 1 ${innerEnd.x.toFixed(3)} ${innerEnd.y.toFixed(3)}`,
    'Z',
  ].join(' ')
}

function getPalaceAngle(index: number) {
  // iztro palace indexes begin at 寅. Rotate the wheel so 子 is at the bottom
  // and 午 is at the top, matching the traditional Zi Wei chart orientation.
  return (index * 30 + 240) % 360
}

function getDisplayStars(palace: PalaceWithStars) {
  const stars = [...palace.majorStars, ...palace.minorStars.filter((star) => star.mutagen)].slice(0, 3)

  return stars.length > 0 ? stars : [{ name: '无主星' }]
}

function findStarPalace(palaces: PalaceWithStars[], starName: string) {
  return palaces.find((palace) => {
    const stars = [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars]
    return stars.some((star) => star.name === starName)
  })
}

function getAspectIndices(index: number | null) {
  if (index === null) return []

  return Array.from(new Set([(index + 4) % 12, (index + 6) % 12, (index + 8) % 12]))
}

function getSelfMutagenStars(palace: PalaceWithStars) {
  const mutagenStars = getMutagensByHeavenlyStem(palace.heavenlyStem as never)
  const visibleNames = new Set(
    [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars].map((star) => star.name),
  )

  return MUTAGEN_ORDER.map((type, index) => {
    const star = mutagenStars[index]
    if (!star || !visibleNames.has(star) || !palace.selfMutaged?.(type)) return null

    return { type, star }
  }).filter(Boolean) as Array<{ type: MutagenType; star: string }>
}

function buildCentrifugalSelfLine(palaceIndex: number, angleOffset: number) {
  const angle = getPalaceAngle(palaceIndex) + angleOffset
  const start = polarToCartesian(LABEL_RADIUS + 3.8, angle)
  const end = polarToCartesian(SELF_LINE_OUTER_RADIUS, angle)

  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}

function buildCentripetalSelfLine(sourceIndex: number, targetIndex: number, angleOffset: number, radiusOffset: number) {
  const radius = SELF_LINE_INNER_RADIUS + radiusOffset * 0.45
  const source = polarToCartesian(radius, getPalaceAngle(sourceIndex) + angleOffset)
  const target = polarToCartesian(radius, getPalaceAngle(targetIndex) + angleOffset)

  return `M ${source.x.toFixed(2)} ${source.y.toFixed(2)} L ${CENTER} ${CENTER} L ${target.x.toFixed(2)} ${target.y.toFixed(2)}`
}

export function CircularAstrolabe({
  config,
  userName,
  selectedPalaceIndex = null,
  onSelectPalace,
  timelineOverlay,
}: CircularAstrolabeProps) {
  const { astrolabe } = useIztro({
    birthday: config.birthday,
    birthTime: config.birthTime,
    birthdayType: config.birthdayType,
    gender: config.gender,
  })
  const [hoveredPalaceIndex, setHoveredPalaceIndex] = useState<number | null>(null)
  const palaces = useMemo(() => (astrolabe?.palaces ?? []) as PalaceWithStars[], [astrolabe])
  const focusPalaceIndex =
    hoveredPalaceIndex ??
    selectedPalaceIndex ??
    palaces.find((palace) => palace.isOriginalPalace)?.index ??
    palaces.find((palace) => palace.isBodyPalace)?.index ??
    null
  const aspectIndices = getAspectIndices(focusPalaceIndex)
  const selfLines = useMemo(() => {
    const centrifugal = palaces.flatMap((palace) => {
      const selfMutagens = getSelfMutagenStars(palace)

      return selfMutagens.map((item, index) => {
        const angleOffset = (index - (selfMutagens.length - 1) / 2) * 2.8

        return {
          key: `centrifugal-${palace.index}-${item.type}-${item.star}`,
          kind: 'centrifugal' as const,
          palaceIndex: palace.index,
          type: item.type,
          star: item.star,
          d: buildCentrifugalSelfLine(palace.index, angleOffset),
        }
      })
    })

    const centripetalCandidates = palaces.flatMap((sourcePalace) => {
      const oppositePalace = palaces.find((palace) => palace.index === (sourcePalace.index + 6) % 12)
      if (!oppositePalace) return []

      const mutagenStars = getMutagensByHeavenlyStem(sourcePalace.heavenlyStem as never)

      const inwardMutagens = MUTAGEN_ORDER.map((type, index) => {
        const star = mutagenStars[index]
        const targetPalace = star ? findStarPalace(palaces, star) : undefined

        if (!star || targetPalace?.index !== oppositePalace.index) return null

        return { type, star }
      }).filter(Boolean) as Array<{ type: MutagenType; star: string }>

      return inwardMutagens.map((item) => ({
        sourcePalaceIndex: sourcePalace.index,
        targetPalaceIndex: oppositePalace.index,
        type: item.type,
        star: item.star,
      }))
    })

    const pairTotals = new Map<string, number>()
    centripetalCandidates.forEach((item) => {
      const pairKey = `${Math.min(item.sourcePalaceIndex, item.targetPalaceIndex)}-${Math.max(
        item.sourcePalaceIndex,
        item.targetPalaceIndex,
      )}`
      pairTotals.set(pairKey, (pairTotals.get(pairKey) ?? 0) + 1)
    })

    const pairIndexes = new Map<string, number>()
    const centripetal = centripetalCandidates.map((item) => {
      const pairKey = `${Math.min(item.sourcePalaceIndex, item.targetPalaceIndex)}-${Math.max(
        item.sourcePalaceIndex,
        item.targetPalaceIndex,
      )}`
      const index = pairIndexes.get(pairKey) ?? 0
      const total = pairTotals.get(pairKey) ?? 1
      const angleOffset = (index - (total - 1) / 2) * 3.2
      pairIndexes.set(pairKey, index + 1)

      return {
        key: `centripetal-${item.sourcePalaceIndex}-${item.targetPalaceIndex}-${item.type}-${item.star}`,
        kind: 'centripetal' as const,
        palaceIndex: item.sourcePalaceIndex,
        targetPalaceIndex: item.targetPalaceIndex,
        type: item.type,
        star: item.star,
        d: buildCentripetalSelfLine(item.sourcePalaceIndex, item.targetPalaceIndex, angleOffset, index),
      }
    }) as Array<{
      key: string
      kind: 'centrifugal' | 'centripetal'
      palaceIndex: number
      targetPalaceIndex?: number
      type: MutagenType
      star: string
      d: string
    }>

    return [...centripetal, ...centrifugal]
  }, [palaces])

  return (
    <div className="circular-board" data-slot="circular-astrolabe">
      <div className="circular-profile" aria-label="命例基本信息">
        <strong>{userName}</strong>
        <span>{astrolabe?.gender === '男' ? '男' : astrolabe?.gender === '女' ? '女' : '性别未定'}</span>
        <small>{astrolabe ? `${astrolabe.lunarDate}${astrolabe.time}` : '农历时间生成中'}</small>
      </div>

      <svg className="circular-ring-layer" viewBox="0 0 100 100" role="img" aria-label="圆形紫微命盘">
        <defs>
          <radialGradient id="circular-core-glow" cx="50%" cy="48%" r="56%">
            <stop offset="0%" stopColor="#fffaf2" />
            <stop offset="58%" stopColor="#efe1ce" />
            <stop offset="100%" stopColor="#d8c3a7" />
          </radialGradient>
          {MUTAGEN_ORDER.map((type) => (
            <marker
              key={`circular-arrowhead-${type}`}
              id={`circular-arrowhead-${type}`}
              markerWidth="3.2"
              markerHeight="3.2"
              refX="2.6"
              refY="1.6"
              orient="auto"
              viewBox="0 0 3.2 3.2"
            >
              <path className={`circular-arrowhead type-${type}`} d="M0,0 L3.2,1.6 L0,3.2 Z" />
            </marker>
          ))}
        </defs>

        <circle className="circular-outer-disc" cx={CENTER} cy={CENTER} r={OUTER_RADIUS} />
        <circle className="circular-inner-disc" cx={CENTER} cy={CENTER} r={INNER_RADIUS} />
        <circle className="circular-orbit circular-orbit--outer" cx={CENTER} cy={CENTER} r={OUTER_RADIUS} />
        <circle className="circular-orbit circular-orbit--middle" cx={CENTER} cy={CENTER} r={35.2} />
        <circle className="circular-orbit circular-orbit--inner" cx={CENTER} cy={CENTER} r={INNER_RADIUS} />

        {palaces.map((palace) => {
          const startAngle = getPalaceAngle(palace.index) - 15
          const endAngle = getPalaceAngle(palace.index) + 15
          const labelPoint = polarToCartesian(LABEL_RADIUS, getPalaceAngle(palace.index))
          const displayedStars = getDisplayStars(palace)
          const starY = labelPoint.y + 4
          const isFocused = palace.index === focusPalaceIndex
          const isSelected = palace.index === selectedPalaceIndex
          const isRelated = aspectIndices.includes(palace.index)
          const decadalPalaceLabel = timelineOverlay?.decadalPalaceLabelsByPalace.get(palace.index)
          const decadeYearLabel = timelineOverlay?.decadeYearLabelsByPalace.get(palace.index)
          const yearlyPalaceLabel = timelineOverlay?.yearlyPalaceLabelsByPalace.get(palace.index)
          const timelineLabel =
            timelineOverlay?.displayMode === 'yearly' ? yearlyPalaceLabel : decadeYearLabel

          return (
            <g
              key={`sector-${palace.earthlyBranch}`}
              className={`circular-palace-wedge ${isFocused ? 'is-focused' : ''} ${
                isSelected ? 'is-selected' : ''
              } ${isRelated ? 'is-related' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={`${palace.name}宫 ${palace.heavenlyStem}${palace.earthlyBranch}`}
              onMouseEnter={() => setHoveredPalaceIndex(palace.index)}
              onMouseLeave={() => setHoveredPalaceIndex((current) => (current === palace.index ? null : current))}
              onClick={() => onSelectPalace?.(palace.index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelectPalace?.(palace.index)
                }
              }}
            >
              <path className="circular-sector" d={describeSector(startAngle, endAngle)} />
              <text className="circular-wedge-label" x={labelPoint.x} y={labelPoint.y}>
                <tspan className="circular-wedge-branch" x={labelPoint.x} dy="-5.2">
                  {palace.heavenlyStem}
                  {palace.earthlyBranch}
                </tspan>
                <tspan className="circular-wedge-name" x={labelPoint.x} dy="4.7">
                  {palace.name}
                  {palace.isBodyPalace ? ' 身' : ''}
                  {palace.isOriginalPalace ? ' 因' : ''}
                </tspan>
                {timelineLabel || decadalPalaceLabel ? (
                  <tspan className="circular-wedge-time" x={labelPoint.x} dy="8.6">
                    {timelineLabel ?? decadalPalaceLabel}
                  </tspan>
                ) : null}
              </text>
              {displayedStars.map((star, starIndex) => {
                const starX = labelPoint.x + (starIndex - (displayedStars.length - 1) / 2) * 5.2
                const pulseX = starX + Math.min(2.8, star.name.length * 1.05)
                const pulseY = starY - 1.25

                return (
                  <g key={`${palace.earthlyBranch}-${star.name}`} className="circular-wedge-star">
                    <text className="circular-wedge-star-text" x={starX} y={starY}>
                      {star.name}
                    </text>
                    {star.mutagen ? (
                      <g className={`circular-birth-mutagen type-${star.mutagen}`} transform={`translate(${pulseX} ${pulseY})`}>
                        <circle className="circular-birth-mutagen-ring" r="0.75" opacity="0">
                          <animate attributeName="r" values="0.75;3.2;3.2" dur="2600ms" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.42;0;0" dur="2600ms" repeatCount="indefinite" />
                        </circle>
                        <circle className="circular-birth-mutagen-ring" r="0.75" opacity="0">
                          <animate
                            attributeName="r"
                            values="0.75;3.2;3.2"
                            dur="2600ms"
                            begin="900ms"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            values="0.36;0;0"
                            dur="2600ms"
                            begin="900ms"
                            repeatCount="indefinite"
                          />
                        </circle>
                        <circle className="circular-birth-mutagen-dot" r="0.72" />
                      </g>
                    ) : null}
                  </g>
                )
              })}
            </g>
          )
        })}

        {Array.from({ length: 12 }, (_, index) => {
          const point = polarToCartesian(OUTER_RADIUS, getPalaceAngle(index) - 15)
          const inner = polarToCartesian(INNER_RADIUS, getPalaceAngle(index) - 15)

          return (
            <line
              key={`divider-${index}`}
              className="circular-divider"
              x1={inner.x}
              y1={inner.y}
              x2={point.x}
              y2={point.y}
            />
          )
        })}

        {selfLines.map((line) => (
          <path
            key={line.key}
            className={`circular-self-line circular-self-line--${line.kind} type-${line.type}`}
            d={line.d}
            markerEnd={line.kind === 'centripetal' ? `url(#circular-arrowhead-${line.type})` : undefined}
          />
        ))}

        <path className="circular-zodiac-guide" d={describeArc(43.8, -8, 352)} />
      </svg>
    </div>
  )
}
