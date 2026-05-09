import { useMemo, useState } from 'react'
import { useIztro } from 'iztro-hook'
import { getMutagensByHeavenlyStem } from 'iztro/lib/utils'
import type { ChartConfig } from '../types'

type SihuaAstrolabeProps = {
  config: ChartConfig
  timelineOverlay?: {
    displayMode: 'decade' | 'yearly'
    activeYear: number
    decadalPalaceLabelsByPalace: Map<number, string>
    decadeYearLabelsByPalace: Map<number, string>
    yearlyPalaceLabelsByPalace: Map<number, string>
  }
}

type MutagenType = '禄' | '权' | '科' | '忌'
type EdgeDirection = 'top' | 'right' | 'bottom' | 'left'
type PalacePoint = { x: number; y: number }
const MUTAGEN_ORDER: MutagenType[] = ['禄', '权', '科', '忌']
const PALACE_OUTER_EDGE: Record<number, EdgeDirection> = {
  0: 'bottom',
  1: 'left',
  2: 'left',
  3: 'top',
  4: 'top',
  5: 'top',
  6: 'top',
  7: 'right',
  8: 'right',
  9: 'bottom',
  10: 'bottom',
  11: 'bottom',
}
const SIHUA_VISIBLE_STARS = new Set([
  '廉贞',
  '破军',
  '武曲',
  '太阳',
  '天机',
  '天梁',
  '紫微',
  '太阴',
  '天同',
  '文昌',
  '巨门',
  '贪狼',
  '右弼',
  '文曲',
  '左辅',
])

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
  fliesTo?: (to: string, withMutagens: MutagenType | MutagenType[]) => boolean
  majorStars: PalaceStar[]
  minorStars: PalaceStar[]
  adjectiveStars: PalaceStar[]
}

type HoverMutagenRow = {
  type: MutagenType
  star: string
  palaceName: string
  heavenlyStem: string
  earthlyBranch: string
  isVisibleMajor: boolean
}

type InwardArrow = {
  key: string
  sourcePalaceIndex: number
  targetPalaceIndex: number
  type: MutagenType
  x1: number
  y1: number
  x2: number
  y2: number
}

type SourceMutagenGroup = {
  sourcePalaceIndex: number
  arrows: Array<{
    type: MutagenType
    targetPalaceIndex: number
  }>
}

const PALACE_EDGE_ANCHORS: Record<number, PalacePoint> = {
  0: { x: 25.2, y: 74.8 },
  1: { x: 25.2, y: 62.5 },
  2: { x: 25.2, y: 37.5 },
  3: { x: 25.2, y: 25.2 },
  4: { x: 37.5, y: 25.2 },
  5: { x: 62.5, y: 25.2 },
  6: { x: 74.8, y: 25.2 },
  7: { x: 74.8, y: 37.5 },
  8: { x: 74.8, y: 62.5 },
  9: { x: 74.8, y: 74.8 },
  10: { x: 62.5, y: 74.8 },
  11: { x: 37.5, y: 74.8 },
}

function findStarPalace(palaces: PalaceWithStars[], starName: string) {
  return palaces.find((palace) => {
    const stars = [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars]
    return stars.some((star) => star.name === starName)
  })
}

function getVisibleSihuaStars(palace: PalaceWithStars) {
  const ordered = [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars].filter(
    (star) => palace.majorStars.some((item) => item.name === star.name) || SIHUA_VISIBLE_STARS.has(star.name) || Boolean(star.mutagen),
  )

  const deduped = new Map<string, PalaceStar>()
  ordered.forEach((star) => {
    if (!deduped.has(star.name)) {
      deduped.set(star.name, star)
    }
  })

  return Array.from(deduped.values())
}

function getSelfMutagenTypes(palace: PalaceWithStars) {
  return MUTAGEN_ORDER.filter((type) => palace.selfMutaged?.(type))
}

function getSelfMutagenStarMap(palace: PalaceWithStars) {
  const mutagenStars = getMutagensByHeavenlyStem(palace.heavenlyStem as never)
  const visibleNames = new Set(
    [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars].map((star) => star.name),
  )
  const byStar = new Map<string, MutagenType[]>()

  MUTAGEN_ORDER.forEach((type, index) => {
    const starName = mutagenStars[index]
    if (!starName || !visibleNames.has(starName) || !palace.selfMutaged?.(type)) return
    const current = byStar.get(starName) ?? []
    current.push(type)
    byStar.set(starName, current)
  })

  return byStar
}

function buildArrowEndpoints(from: PalacePoint, to: PalacePoint, offset = 0, trim = 1.2) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy) || 1
  const ux = dx / distance
  const uy = dy / distance
  const px = -uy
  const py = ux
  return {
    x1: from.x + ux * trim + px * offset,
    y1: from.y + uy * trim + py * offset,
    x2: to.x - ux * trim + px * offset,
    y2: to.y - uy * trim + py * offset,
  }
}

function buildPairedArrowEndpoints(
  sourceIndex: number,
  targetIndex: number,
  offset = 0,
  trim = 1.8,
) {
  const canonicalSourceIndex = Math.min(sourceIndex, targetIndex)
  const canonicalTargetIndex = Math.max(sourceIndex, targetIndex)
  const canonicalFrom = PALACE_EDGE_ANCHORS[canonicalSourceIndex] ?? { x: 50, y: 50 }
  const canonicalTo = PALACE_EDGE_ANCHORS[canonicalTargetIndex] ?? { x: 50, y: 50 }
  const effectiveOffset = sourceIndex === canonicalSourceIndex ? offset : -offset
  const canonicalPoints = buildArrowEndpoints(canonicalFrom, canonicalTo, effectiveOffset, trim)

  if (sourceIndex === canonicalSourceIndex) {
    return canonicalPoints
  }

  return {
    x1: canonicalPoints.x2,
    y1: canonicalPoints.y2,
    x2: canonicalPoints.x1,
    y2: canonicalPoints.y1,
  }
}

export function SihuaAstrolabe({ config, timelineOverlay }: SihuaAstrolabeProps) {
  const { astrolabe } = useIztro({
    birthday: config.birthday,
    birthTime: config.birthTime,
    birthdayType: config.birthdayType,
    gender: config.gender,
  })

  const [hoveredPalaceIndex, setHoveredPalaceIndex] = useState<number | null>(null)
  const palaces = useMemo(() => (astrolabe?.palaces ?? []) as PalaceWithStars[], [astrolabe])
  const hoveredPalace =
    hoveredPalaceIndex === null ? undefined : palaces.find((palace) => palace.index === hoveredPalaceIndex)
  const selfMutagenLookup = useMemo(() => {
    const byPalace = new Map<number, MutagenType[]>()
    const byStar = new Map<number, Map<string, MutagenType[]>>()

    palaces.forEach((palace) => {
      const selfTypes = getSelfMutagenTypes(palace)
      if (selfTypes.length > 0) {
        byPalace.set(palace.index, selfTypes)
        byStar.set(palace.index, getSelfMutagenStarMap(palace))
      }
    })

    return { byPalace, byStar }
  }, [palaces])
  const sourceMutagenGroups = useMemo<SourceMutagenGroup[]>(() => {
    return palaces
      .map((sourcePalace) => {
        const oppositePalaceIndex = (sourcePalace.index + 6) % 12
        const oppositePalace = palaces.find((palace) => palace.index === oppositePalaceIndex)
        if (!oppositePalace) {
          return {
            sourcePalaceIndex: sourcePalace.index,
            arrows: [],
          }
        }

        const mutagenStars = getMutagensByHeavenlyStem(sourcePalace.heavenlyStem as never)
        const arrows = MUTAGEN_ORDER.map((type, index) => {
          const starName = mutagenStars[index]
          const targetPalace = starName ? findStarPalace(palaces, starName) : undefined

          if (!targetPalace || targetPalace.index !== oppositePalace.index) {
            return null
          }

          return {
            type,
            targetPalaceIndex: oppositePalace.index,
          }
        }).filter(Boolean) as Array<{ type: MutagenType; targetPalaceIndex: number }>

        return {
          sourcePalaceIndex: sourcePalace.index,
          arrows,
        }
      })
      .filter((group) => group.arrows.length > 0)
  }, [palaces])

  const hoveredMutagens: HoverMutagenRow[] = !hoveredPalace
    ? []
    : (() => {
        const stars = getMutagensByHeavenlyStem(hoveredPalace.heavenlyStem as never)

        return MUTAGEN_ORDER.map((type, index) => {
          const star = stars[index] ?? '未定'
          const targetPalace = findStarPalace(palaces, star)
          const isVisibleMajor = Boolean(
            targetPalace && getVisibleSihuaStars(targetPalace).some((item) => item.name === star),
          )

          return {
            type,
            star,
            palaceName: targetPalace?.name ?? '未定位',
            heavenlyStem: targetPalace?.heavenlyStem ?? '',
            earthlyBranch: targetPalace?.earthlyBranch ?? '',
            isVisibleMajor,
          }
        })
      })()

  const hoverLookup = (() => {
    const byStar = new Map<string, MutagenType>()
    const byPalace = new Map<number, MutagenType[]>()

    hoveredMutagens.forEach((row) => {
      byStar.set(row.star, row.type)

      const targetPalace = palaces.find(
        (palace) =>
          palace.name === row.palaceName &&
          palace.heavenlyStem === row.heavenlyStem &&
          palace.earthlyBranch === row.earthlyBranch,
      )

      if (!targetPalace) return

      const current = byPalace.get(targetPalace.index) ?? []
      current.push(row.type)
      byPalace.set(targetPalace.index, current)
    })

    return { byStar, byPalace }
  })()

  const inwardArrows = useMemo<InwardArrow[]>(() => {
    return sourceMutagenGroups.flatMap((group) => {
      return group.arrows.map((arrow, index, collection) => {
        const offsetSeed = index - (collection.length - 1) / 2
        const pairKey = `${Math.min(group.sourcePalaceIndex, arrow.targetPalaceIndex)}-${Math.max(group.sourcePalaceIndex, arrow.targetPalaceIndex)}`
        const pairDirectionBias = group.sourcePalaceIndex < arrow.targetPalaceIndex ? -1.15 : 1.15
        const parallelOffset = offsetSeed * 0.95
        const points = buildPairedArrowEndpoints(
          group.sourcePalaceIndex,
          arrow.targetPalaceIndex,
          pairDirectionBias + parallelOffset,
          1.8,
        )

        return {
          key: `${pairKey}-${group.sourcePalaceIndex}-${arrow.targetPalaceIndex}-${arrow.type}-${index}`,
          sourcePalaceIndex: group.sourcePalaceIndex,
          targetPalaceIndex: arrow.targetPalaceIndex,
          type: arrow.type,
          ...points,
        }
      })
    })
  }, [sourceMutagenGroups])

  return (
    <div className="sihua-board">
      <div className="sihua-center-core" aria-hidden="true" />
      {inwardArrows.length > 0 ? (
        <svg className="sihua-arrow-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="sihua-arrowhead-禄" markerWidth="3.2" markerHeight="3.2" refX="3" refY="1.6" orient="auto">
              <path d="M0,0 L3.2,1.6 L0,3.2 Z" fill="#3d8f48" />
            </marker>
            <marker id="sihua-arrowhead-权" markerWidth="3.2" markerHeight="3.2" refX="3" refY="1.6" orient="auto">
              <path d="M0,0 L3.2,1.6 L0,3.2 Z" fill="#7d4bba" />
            </marker>
            <marker id="sihua-arrowhead-科" markerWidth="3.2" markerHeight="3.2" refX="3" refY="1.6" orient="auto">
              <path d="M0,0 L3.2,1.6 L0,3.2 Z" fill="#3569c8" />
            </marker>
            <marker id="sihua-arrowhead-忌" markerWidth="3.2" markerHeight="3.2" refX="3" refY="1.6" orient="auto">
              <path d="M0,0 L3.2,1.6 L0,3.2 Z" fill="#c44a4a" />
            </marker>
          </defs>
          {inwardArrows.map((arrow) => (
            <line
              key={arrow.key}
              className={`sihua-inward-arrow type-${arrow.type} ${
                hoveredPalaceIndex !== null &&
                (hoveredPalaceIndex === arrow.sourcePalaceIndex ||
                  hoveredPalaceIndex === arrow.targetPalaceIndex)
                  ? 'is-active'
                  : ''
              }`}
              x1={arrow.x1}
              y1={arrow.y1}
              x2={arrow.x2}
              y2={arrow.y2}
              markerEnd={`url(#sihua-arrowhead-${arrow.type})`}
            />
          ))}
        </svg>
      ) : null}

      {palaces.map((palace) => {
        const activeTypes = hoverLookup.byPalace.get(palace.index) ?? []
        const selfStarMap = selfMutagenLookup.byStar.get(palace.index) ?? new Map<string, MutagenType[]>()
        const outerEdge = PALACE_OUTER_EDGE[palace.index] ?? 'top'
        const decadalPalaceLabel = timelineOverlay?.decadalPalaceLabelsByPalace.get(palace.index)
        const decadeYearLabel = timelineOverlay?.decadeYearLabelsByPalace.get(palace.index)
        const yearlyPalaceLabel = timelineOverlay?.yearlyPalaceLabelsByPalace.get(palace.index)

        return (
          <section
            key={palace.earthlyBranch}
            className={`sihua-palace ${hoveredPalaceIndex === palace.index ? 'is-hovered' : ''} ${
              hoveredPalaceIndex !== null &&
              inwardArrows.some(
                (arrow) =>
                  arrow.sourcePalaceIndex === hoveredPalaceIndex && arrow.targetPalaceIndex === palace.index,
              )
                ? 'is-self-opposite'
                : ''
            }`}
            data-types={activeTypes.join(' ')}
            style={{ gridArea: `g${palace.index}` }}
            onMouseEnter={() => setHoveredPalaceIndex(palace.index)}
            onMouseLeave={() => setHoveredPalaceIndex((current) => (current === palace.index ? null : current))}
          >
            {timelineOverlay?.displayMode === 'decade' && decadeYearLabel ? (
              <div className="sihua-timeline-tag sihua-timeline-tag--year">{decadeYearLabel}</div>
            ) : null}
            {timelineOverlay?.displayMode === 'yearly' && yearlyPalaceLabel ? (
              <div className="sihua-timeline-tag sihua-timeline-tag--palace">{yearlyPalaceLabel}</div>
            ) : null}

            <div className="sihua-palace-stars">
              {getVisibleSihuaStars(palace).map((star) => {
                const hoverType = hoverLookup.byStar.get(star.name)
                const selfTypesForStar = selfStarMap.get(star.name) ?? []
                return (
                  <div
                    key={`${palace.earthlyBranch}-${star.name}`}
                    className={`sihua-star ${hoverType ? `is-hover-${hoverType}` : ''} ${
                      selfTypesForStar.length > 0 ? 'has-self-tail' : ''
                    }`}
                  >
                    <span className="sihua-star-name">{star.name}</span>
                    {selfTypesForStar.length > 0 ? (
                      <span className="sihua-star-selftails" data-edge={outerEdge} aria-hidden="true">
                        {selfTypesForStar.map((type) => (
                          <i key={`${palace.index}-${star.name}-${type}`} className={`sihua-self-tail type-${type}`} />
                        ))}
                      </span>
                    ) : null}
                    {star.mutagen ? <i className={`sihua-star-mutagen type-${star.mutagen}`}>{star.mutagen}</i> : null}
                    {star.brightness ? <small className="sihua-star-brightness">{star.brightness}</small> : null}
                  </div>
                )
              })}
            </div>

            <footer className="sihua-palace-footer">
              <div className="sihua-palace-name">
                <span>{palace.name}</span>
                {palace.isBodyPalace ? <em>身</em> : null}
                {palace.isOriginalPalace ? <em className="is-original">来因</em> : null}
              </div>
              {decadalPalaceLabel ? <div className="sihua-decadal-tag">{decadalPalaceLabel}</div> : null}
              <div className="sihua-palace-gz">
                {palace.heavenlyStem}
                {palace.earthlyBranch}
              </div>
            </footer>
          </section>
        )
      })}
    </div>
  )
}
