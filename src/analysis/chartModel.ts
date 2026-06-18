// @ts-nocheck
import { astro } from 'iztro'
import type { ChartConfig } from '../types'
import type { ChartModel, FeiHua, GongName, PalaceModel, SiHua, SiHuaType, StarModel, ZiHua } from './types'

export const GONG_ORDER: GongName[] = [
  '命宫',
  '兄弟',
  '夫妻',
  '子女',
  '财帛',
  '疾厄',
  '迁移',
  '交友',
  '官禄',
  '田宅',
  '福德',
  '父母',
]

export const SIHUA_ORDER: SiHuaType[] = ['禄', '权', '科', '忌']

export const STEM_MUTAGENS: Record<string, Record<SiHuaType, string>> = {
  甲: { 禄: '廉贞', 权: '破军', 科: '武曲', 忌: '太阳' },
  乙: { 禄: '天机', 权: '天梁', 科: '紫微', 忌: '太阴' },
  丙: { 禄: '天同', 权: '天机', 科: '文昌', 忌: '廉贞' },
  丁: { 禄: '太阴', 权: '天同', 科: '天机', 忌: '巨门' },
  戊: { 禄: '贪狼', 权: '太阴', 科: '右弼', 忌: '天机' },
  己: { 禄: '武曲', 权: '贪狼', 科: '天梁', 忌: '文曲' },
  庚: { 禄: '太阳', 权: '武曲', 科: '太阴', 忌: '天同' },
  辛: { 禄: '巨门', 权: '太阳', 科: '文曲', 忌: '文昌' },
  壬: { 禄: '天梁', 权: '紫微', 科: '左辅', 忌: '武曲' },
  癸: { 禄: '破军', 权: '巨门', 科: '太阴', 忌: '贪狼' },
}

export function normalizeGongName(name: string): GongName {
  const normalized = String(name || '').replace(/宫$/, '')
  if (normalized === '命') return '命宫'
  if (normalized === '仆役') return '交友'
  return (GONG_ORDER.find((item) => item.replace(/宫$/, '') === normalized) ?? '命宫') as GongName
}

export function getOppositeGong(name: GongName): GongName {
  const index = GONG_ORDER.indexOf(name)
  return GONG_ORDER[(index + 6) % 12]
}

export function getSanFang(name: GongName) {
  const index = GONG_ORDER.indexOf(name)
  return {
    main: name,
    duiGong: GONG_ORDER[(index + 6) % 12],
    left: GONG_ORDER[(index + 4) % 12],
    right: GONG_ORDER[(index + 8) % 12],
  }
}

function getAstrolabe(config: ChartConfig) {
  return astro.withOptions({
    type: config.birthdayType,
    dateStr: config.birthday,
    timeIndex: config.birthTime,
    gender: config.gender,
    isLeapMonth: false,
    language: 'zh-CN',
  })
}

function toSiHuaType(value: unknown): SiHuaType | undefined {
  return SIHUA_ORDER.find((item) => item === value)
}

export function buildChartModel(config: ChartConfig): ChartModel | null {
  try {
    const astrolabe = getAstrolabe(config)
    // iztro palace(i) returns clockwise from 命宫:
    //   0=命宫,1=父母,2=福德,3=田宅,4=官禄,5=交友,6=迁移,7=疾厄,8=财帛,9=子女,10=夫妻,11=兄弟
    // GONG_ORDER is counter-clockwise from 命宫:
    //   0=命宫,1=兄弟,2=夫妻,3=子女,4=财帛,5=疾厄,6=迁移,7=交友,8=官禄,9=田宅,10=福德,11=父母
    const IZTRO_TO_GONG = { 0: 0, 1: 11, 2: 10, 3: 9, 4: 8, 5: 7, 6: 6, 7: 5, 8: 4, 9: 3, 10: 2, 11: 1 }
    const toGongIdx = (izIdx: number) => (IZTRO_TO_GONG as Record<number, number>)[izIdx] ?? 0
    // .palace(i) returns full FunctionalPalace (methods work); .palaces array is thin.
    const palaces = Array.from({ length: 12 }, (_, i) => astrolabe.palace(i))
    const laiyinPalace = palaces.find((p) => p.isOriginalPalace) ?? palaces[0]
    const bodyPalace = palaces.find((p) => p.isBodyPalace)
    const shengNianSiHua: SiHua[] = []
    const ziHua: ZiHua[] = []
    const feiHua: FeiHua[] = []

    const palaceModels: PalaceModel[] = palaces.map((palace) => {
      const name = normalizeGongName(palace.name)
      const allStars = [
        ...palace.majorStars.map((star) => ({ star, category: 'major' as const })),
        ...palace.minorStars.map((star) => ({ star, category: 'minor' as const })),
        ...palace.adjectiveStars.map((star) => ({ star, category: 'adjective' as const })),
      ]
      const natalStar = allStars.find((item) => toSiHuaType(item.star.mutagen))
      const natalHua = toSiHuaType(natalStar?.star.mutagen)
      const selfType = SIHUA_ORDER.find((type) => palace.selfMutaged?.(type))

      return {
        index: toGongIdx(palace.index),
        name,
        diZhi: palace.earthlyBranch,
        heavenlyStem: palace.heavenlyStem,
        daXianRange: palace.decadal?.range?.join('-'),
        mainStar: palace.majorStars.map((star) => star.name),
        minorStar: palace.minorStars.map((star) => star.name),
        adjectiveStar: palace.adjectiveStars.map((star) => star.name),
        majorStar: palace.majorStars[0]?.name,
        coStar: palace.majorStars[1]?.name,
        majorStarBrightness: palace.majorStars[0]?.brightness,
        coStarBrightness: palace.majorStars[1]?.brightness,
        minorStars: palace.minorStars.map((star) => star.name),
        shengNianSiHua:
          natalStar && natalHua
            ? {
                star: natalStar.star.name,
                hua: natalHua,
              }
            : undefined,
        ziHua: selfType
          ? {
              star: STEM_MUTAGENS[palace.heavenlyStem]?.[selfType] ?? '',
              hua: selfType,
              direction: '离心',
            }
          : undefined,
      }
    })

    const stars: StarModel[] = palaces.flatMap((palace) => {
      const palaceName = normalizeGongName(palace.name)
      return [
        ...palace.majorStars.map((star) => ({ star, category: 'major' as const })),
        ...palace.minorStars.map((star) => ({ star, category: 'minor' as const })),
        ...palace.adjectiveStars.map((star) => ({ star, category: 'adjective' as const })),
      ].map(({ star, category }) => ({
        name: star.name,
        palace: palaceName,
        brightness: star.brightness,
        mutagen: toSiHuaType(star.mutagen),
        category,
      }))
    })

    palaces.forEach((palace) => {
      const sourcePalace = normalizeGongName(palace.name)
      const mutagedPlaces = palace.mutagedPlaces?.() ?? []
      const stemMap = STEM_MUTAGENS[palace.heavenlyStem]

      stars
        .filter((star) => star.palace === sourcePalace && star.mutagen)
        .forEach((star) => {
          shengNianSiHua.push({
            type: star.mutagen as SiHuaType,
            star: star.name,
            palace: sourcePalace,
            palaceIndex: toGongIdx(palace.index),
          })
        })

      SIHUA_ORDER.forEach((hua, index) => {
        const target = mutagedPlaces[index]
        const star = stemMap?.[hua] ?? ''
        if (target && star) {
          const targetPalace = normalizeGongName(target.name)
          feiHua.push({
            sourcePalace,
            sourcePalaceIndex: toGongIdx(palace.index),
            targetPalace,
            targetPalaceIndex: toGongIdx(target.index),
            star,
            hua,
          })

          if (target.index === (palace.index + 6) % 12) {
            ziHua.push({
              sourcePalace,
              sourcePalaceIndex: toGongIdx(palace.index),
              targetPalace,
              targetPalaceIndex: toGongIdx(target.index),
              star,
              hua,
              direction: '向心',
            })
          }
        }

        if (palace.selfMutaged?.(hua)) {
          ziHua.push({
            sourcePalace,
            sourcePalaceIndex: toGongIdx(palace.index),
            targetPalace: sourcePalace,
            targetPalaceIndex: toGongIdx(palace.index),
            star,
            hua,
            direction: '离心',
          })
        }
      })
    })

    // Sort palaceModels by GONG_ORDER index (counter-clockwise from 命宫)
    palaceModels.sort((a, b) => a.index - b.index)

    return {
      basicInfo: {
        gender: config.gender,
        birthYear: new Date(config.birthday).getFullYear(),
        lunarBirth: astrolabe.lunarDate,
        shengxiao: astrolabe.zodiac,
        tianGan: config.bazi?.yearPillar?.slice(0, 1) ?? '',
        shenGong: bodyPalace ? normalizeGongName(bodyPalace.name) : '命宫',
        wuXingJu: astrolabe.fiveElementsClass,
      },
      palaces: palaceModels,
      stars,
      shengNianSiHua,
      ziHua,
      feiHua,
      daXian: palaceModels.map((palace) => ({
        palace: palace.name,
        palaceIndex: palace.index,
        range: palace.daXianRange ?? '',
      })),
      laiyinGong: normalizeGongName(laiyinPalace.name),
      bazi: config.bazi?.yearPillar ? {
        year: config.bazi.yearPillar,
        month: config.bazi.monthPillar,
        day: config.bazi.dayPillar,
        hour: config.bazi.hourPillar,
      } : undefined,
    }
  } catch {
    return null
  }
}
