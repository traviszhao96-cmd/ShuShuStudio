/**
 * 命理档案持久化
 *
 * ChartProfile 在 AI 格局分析完成后保存到 localStorage。
 * 后续工具（天赋地图、职业规划等）直接读取缓存。
 */

import type { ChartProfile } from '../analysis/types'

const STORAGE_KEY = 'ssmaster-chart-profiles'

export function loadProfiles(): Record<string, ChartProfile> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveProfiles(profiles: Record<string, ChartProfile>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
}

/** 获取指定 caseId 的命理档案 */
export function getProfile(caseId: string): ChartProfile | null {
  const all = loadProfiles()
  return all[caseId] ?? null
}

/** 保存命理档案（按 caseId 覆盖） */
export function saveProfile(caseId: string, profile: ChartProfile) {
  const all = loadProfiles()
  all[caseId] = profile
  saveProfiles(all)
}

/** 删除指定 caseId 的命理档案 */
export function deleteProfile(caseId: string) {
  const all = loadProfiles()
  delete all[caseId]
  saveProfiles(all)
}

/** 检查档案是否仍有效（命盘未变更） */
export function isProfileStale(caseId: string, currentHash: string): boolean {
  const profile = getProfile(caseId)
  if (!profile) return true
  return profile.chartModelHash !== currentHash
}
