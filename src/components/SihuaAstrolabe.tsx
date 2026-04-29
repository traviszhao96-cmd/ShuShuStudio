import { useMemo, useState } from 'react'
import { useIztro } from 'iztro-hook'
import { getMutagensByHeavenlyStem } from 'iztro/lib/utils'
import type { ChartConfig } from '../types'

type SihuaAstrolabeProps = {
  config: ChartConfig
}

type MutagenType = '禄' | '权' | '科' | '忌'
type EdgeDirection = 'top' | 'right' | 'bottom' | 'left'
type PalacePoint = { x: number; y: number }
type VectorLane = { start: PalacePoint; end: PalacePoint }

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
const CENTER_VECTOR_LANES: Record<number, VectorLane> = {
  0: { start: { x: 33, y: 71 }, end: { x: 67, y: 29 } },
  1: { start: { x: 28, y: 62 }, end: { x: 72, y: 38 } },
  2: { start: { x: 28, y: 38 }, end: { x: 72, y: 62 } },
  3: { start: { x: 33, y: 29 }, end: { x: 67, y: 71 } },
  4: { start: { x: 41, y: 28 }, end: { x: 59, y: 72 } },
  5: { start: { x: 59, y: 28 }, end: { x: 41, y: 72 } },
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
  selfMutaged?: (withMutagens: MutagenType | MutagenType[]) => boolean
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

function buildArrowEndpoints(from: PalacePoint, to: PalacePoint, offset = 0) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy) || 1
  const ux = dx / distance
  const uy = dy / distance
  const px = -uy
  const py = ux
  const trim = 8

  return {
    x1: from.x + ux * trim + px * offset,
    y1: from.y + uy * trim + py * offset,
    x2: to.x - ux * trim + px * offset,
    y2: to.y - uy * trim + py * offset,
  }
}

function getLaneForPalace(index: number, oppositeIndex: number) {
  const pairKey = Math.min(index, oppositeIndex)
  const lane = CENTER_VECTOR_LANES[pairKey]

  if (!lane) return undefined

  return index === pairKey
    ? lane
    : {
        start: lane.end,
        end: lane.start,
      }
}

export function SihuaAstrolabe({ config }: SihuaAstrolabeProps) {
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
  const hoveredSelfMutagens = hoveredPalace ? selfMutagenLookup.byPalace.get(hoveredPalace.index) ?? [] : []
  const hoveredOppositePalaceIndex = hoveredPalace ? (hoveredPalace.index + 6) % 12 : null
  const hoveredOppositePalace =
    hoveredOppositePalaceIndex === null ? undefined : palaces.find((palace) => palace.index === hoveredOppositePalaceIndex)

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

  const inwardArrows =
    hoveredPalace && hoveredOppositePalace && hoveredSelfMutagens.length > 0
      ? hoveredSelfMutagens.map((type, index, collection) => {
          const lane = getLaneForPalace(hoveredPalace.index, hoveredOppositePalace.index)
          const offsetSeed = index - (collection.length - 1) / 2
          const points = lane
            ? buildArrowEndpoints(lane.start, lane.end, offsetSeed * 2.4)
            : buildArrowEndpoints({ x: 34, y: 66 }, { x: 66, y: 34 }, offsetSeed * 2.4)
          return {
            type,
            ...points,
          }
        })
      : []

  return (
    <div className="sihua-board">
      <div className="sihua-center-core" aria-hidden="true" />
      {inwardArrows.length > 0 ? (
        <svg className="sihua-arrow-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="sihua-arrowhead-禄" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="#3d8f48" />
            </marker>
            <marker id="sihua-arrowhead-权" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="#7d4bba" />
            </marker>
            <marker id="sihua-arrowhead-科" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="#3569c8" />
            </marker>
            <marker id="sihua-arrowhead-忌" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="#c44a4a" />
            </marker>
          </defs>
          {inwardArrows.map((arrow) => (
            <line
              key={`${hoveredPalace?.index}-${arrow.type}`}
              className={`sihua-inward-arrow type-${arrow.type}`}
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

        return (
          <section
            key={palace.earthlyBranch}
            className={`sihua-palace ${hoveredPalaceIndex === palace.index ? 'is-hovered' : ''} ${
              hoveredOppositePalaceIndex === palace.index && hoveredSelfMutagens.length > 0 ? 'is-self-opposite' : ''
            }`}
            data-types={activeTypes.join(' ')}
            style={{ gridArea: `g${palace.index}` }}
            onMouseEnter={() => setHoveredPalaceIndex(palace.index)}
            onMouseLeave={() => setHoveredPalaceIndex((current) => (current === palace.index ? null : current))}
          >
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
              </div>
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
