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
  selectedPalaceIndex?: number | null
  onSelectPalace?: (palaceIndex: number | null) => void
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
const INNER_RADIUS = 20
const BRANCH_RADIUS = 24
const DECADE_RADIUS = 28
const LABEL_RADIUS = 32
const YEARLY_RADIUS = 36
const STAR_OUTER_RADIUS = 42.5
const SELF_LINE_INNER_RADIUS = 20
const CENTER_HUB = 3.5
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

function buildArcPath(radius: number, centerAngle: number, spread: number) {
  const s = polarToCartesian(radius, centerAngle - spread)
  const e = polarToCartesian(radius, centerAngle + spread)
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
}

function getPalaceAngle(index: number) {
  // iztro palace indexes begin at 寅. Rotate the wheel so 子 is at the bottom
  // and 午 is at the top, matching the traditional Zi Wei chart orientation.
  return (index * 30 + 240) % 360
}

function getDisplayStars(palace: PalaceWithStars) {
  const stars = [...palace.majorStars, ...palace.minorStars].slice(0, 4)

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

function buildCentripetalSelfLine(sourceIndex: number, targetIndex: number, angleOffset: number, radiusOffset: number) {
  const radius = SELF_LINE_INNER_RADIUS - radiusOffset * 0.45
  const source = polarToCartesian(radius, getPalaceAngle(sourceIndex) + angleOffset)
  const target = polarToCartesian(radius, getPalaceAngle(targetIndex) + angleOffset)
  const hubIn = polarToCartesian(CENTER_HUB, getPalaceAngle(sourceIndex) + angleOffset)
  const hubOut = polarToCartesian(CENTER_HUB, getPalaceAngle(targetIndex) + angleOffset)

  return `M ${source.x.toFixed(2)} ${source.y.toFixed(2)} L ${hubIn.x.toFixed(2)} ${hubIn.y.toFixed(2)} L ${hubOut.x.toFixed(2)} ${hubOut.y.toFixed(2)} L ${target.x.toFixed(2)} ${target.y.toFixed(2)}`
}

export function CircularAstrolabe({
  config,
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
  const selectedMutagenMap = useMemo(() => {
    const map = new Map<string, MutagenType>()
    if (selectedPalaceIndex === null || selectedPalaceIndex === undefined) return map
    const palace = palaces[selectedPalaceIndex]
    if (!palace) return map
    const mutagenStars = getMutagensByHeavenlyStem(palace.heavenlyStem as never)
    MUTAGEN_ORDER.forEach((type, index) => {
      const star = mutagenStars[index]
      if (star) map.set(star, type)
    })
    return map
  }, [selectedPalaceIndex, palaces])
  const { selfLines, centrifugalTypeMap } = useMemo(() => {
    const centrifugalTypeMap = new Map<string, MutagenType>()
    palaces.forEach((palace) => {
      const selfMutagens = getSelfMutagenStars(palace)
      selfMutagens.forEach((item) => {
        centrifugalTypeMap.set(`${palace.index}-${item.star}`, item.type)
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

    return { selfLines: centripetal, centrifugalTypeMap }
  }, [palaces])

  return (
    <div className="circular-board" data-slot="circular-astrolabe">
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
        <circle className="circular-orbit circular-orbit--inner" cx={CENTER} cy={CENTER} r={INNER_RADIUS} />

        {palaces.map((palace) => {
          const startAngle = getPalaceAngle(palace.index) - 15
          const endAngle = getPalaceAngle(palace.index) + 15
          const angle = getPalaceAngle(palace.index)
          const displayedStars = getDisplayStars(palace)
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
              onClick={() => onSelectPalace?.(palace.index === selectedPalaceIndex ? null : palace.index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelectPalace?.(palace.index === selectedPalaceIndex ? null : palace.index)
                }
              }}
            >
              <path className="circular-sector" d={describeSector(startAngle, endAngle)} />
              <path id={`arc-br-${palace.index}`} className="arc-guide" d={buildArcPath(BRANCH_RADIUS, angle, 7)} />
              <path id={`arc-nm-${palace.index}`} className="arc-guide" d={buildArcPath(LABEL_RADIUS, angle, 9)} />
              {decadalPalaceLabel ? (
                <path id={`arc-dc-${palace.index}`} className="arc-guide" d={buildArcPath(DECADE_RADIUS, angle, 8)} />
              ) : null}
              {timelineLabel ? (
                <path id={`arc-yr-${palace.index}`} className="arc-guide" d={buildArcPath(YEARLY_RADIUS, angle, 9)} />
              ) : null}
              <text className="circular-wedge-branch">
                <textPath href={`#arc-br-${palace.index}`} startOffset="50%" textAnchor="middle">
                  {palace.heavenlyStem}{palace.earthlyBranch}
                </textPath>
              </text>
              {decadalPalaceLabel ? (
                <text className="circular-wedge-decade">
                  <textPath href={`#arc-dc-${palace.index}`} startOffset="50%" textAnchor="middle">
                    {decadalPalaceLabel}
                  </textPath>
                </text>
              ) : null}
              <text className="circular-wedge-name">
                <textPath href={`#arc-nm-${palace.index}`} startOffset="50%" textAnchor="middle">
                  {palace.name}
                </textPath>
              </text>
              {(() => {
                const tags: string[] = []
                if (palace.isBodyPalace) tags.push('身')
                if (palace.isOriginalPalace) tags.push('因')
                if (tags.length === 0) return null

                const tagAngle = angle + 13
                const spread = tags.length === 1 ? 4 : 7
                const TW = 3.6; const TH = 2.4
                return (
                  <g key="tags">
                    <path id={`arc-tg-${palace.index}`} className="arc-guide" d={buildArcPath(LABEL_RADIUS, tagAngle, spread)} />
                    {tags.map((label, i) => {
                      const ta = tagAngle + (i - (tags.length - 1) / 2) * spread * 0.7
                      const tp = polarToCartesian(LABEL_RADIUS, ta)
                      return (
                        <g key={label}>
                          <rect className="palace-tag" x={tp.x - TW/2} y={tp.y - TH/2} width={TW} height={TH} rx={TH/2} />
                          <text className="palace-tag-text">
                            <textPath href={`#arc-tg-${palace.index}`}
                              startOffset={tags.length === 1 ? '50%' : `${25 + i * 50}%`}
                              textAnchor="middle">
                              {label}
                            </textPath>
                          </text>
                        </g>
                      )
                    })}
                  </g>
                )
              })()}
              {timelineLabel ? (
                <text className="circular-wedge-yearly">
                  <textPath href={`#arc-yr-${palace.index}`} startOffset="50%" textAnchor="middle">
                    {timelineLabel}
                  </textPath>
                </text>
              ) : null}
              {displayedStars.map((star, starIndex) => {
                const starAngleOffset = (starIndex - (displayedStars.length - 1) / 2) * 5.5
                const starAngle = angle + starAngleOffset
                const sp = polarToCartesian(STAR_OUTER_RADIUS, starAngle)
                const sx = sp.x
                const sy = sp.y
                const charH = 2.8
                const textH = star.name.length * charH
                const rectW = 3.2
                const rectH = textH + 1.4
                const rectX = -rectW / 2
                const rectY = -rectH / 2
                const firstY = -(star.name.length - 1) * charH / 2
                return (
                  <g key={`${palace.earthlyBranch}-${star.name}`} className="circular-wedge-star"
                    transform={`translate(${sx}, ${sy}) rotate(${starAngle})`}>
                    {(() => {
                      const type = centrifugalTypeMap.get(`${palace.index}-${star.name}`)
                      if (!type) return null
                      return (
                        <line
                          className={`circular-self-line circular-self-line--centrifugal type-${type}`}
                          x1={0} y1={firstY - 0.8}
                          x2={0} y2={firstY - 5}
                          markerEnd={`url(#circular-arrowhead-${type})`}
                        />
                      )
                    })()}
                    {star.mutagen ? (
                      <rect
                        className={`birth-mutagen-bg type-${star.mutagen}`}
                        x={rectX} y={rectY}
                        width={rectW} height={rectH}
                        rx={rectW / 2}
                      >
                        <animate
                          attributeName="opacity"
                          values="0.22;0.42;0.22"
                          dur="2600ms"
                          repeatCount="indefinite"
                        />
                      </rect>
                    ) : null}
                    <text className="circular-wedge-star-text" textAnchor="middle">
                      {star.name.split('').map((char, ci) => (
                        <tspan key={ci} x={0} dy={ci === 0 ? firstY : charH}>{char}</tspan>
                      ))}
                    </text>
                    {selectedMutagenMap.has(star.name) ? (
                      <rect
                        className={`selection-mutagen-border type-${selectedMutagenMap.get(star.name)}`}
                        x={rectX} y={rectY}
                        width={rectW} height={rectH}
                        rx={rectW / 2}
                      />
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
            markerEnd={`url(#circular-arrowhead-${line.type})`}
          />
        ))}

        <path className="circular-zodiac-guide" d={describeArc(43.8, -8, 352)} />
      </svg>
    </div>
  )
}
