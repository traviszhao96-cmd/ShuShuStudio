import { caseRecords } from './data'
import type { CaseRecord } from './types'

const CASE_STORAGE_KEY = 'ssmaster-case-drafts'

function isCaseRecordArray(value: unknown): value is CaseRecord[] {
  return Array.isArray(value) && value.every((item) => item && typeof item === 'object' && 'id' in item)
}

export function loadCases() {
  if (typeof window === 'undefined') return caseRecords

  const raw = window.localStorage.getItem(CASE_STORAGE_KEY)
  if (!raw) return caseRecords

  try {
    const savedCases = JSON.parse(raw) as unknown
    if (!isCaseRecordArray(savedCases)) return caseRecords

    const savedById = new Map(savedCases.map((item) => [item.id, item]))
    const bundledIds = new Set(caseRecords.map((item) => item.id))
    const mergedBundledCases = caseRecords.map((item) => ({
      ...item,
      ...savedById.get(item.id),
    }))
    const localCases = savedCases.filter((item) => !bundledIds.has(item.id))

    return [...mergedBundledCases, ...localCases]
  } catch {
    return caseRecords
  }
}

export function loadLocalCases() {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(CASE_STORAGE_KEY)
  if (!raw) return []
  try {
    const savedCases = JSON.parse(raw) as unknown
    return isCaseRecordArray(savedCases) ? savedCases : []
  } catch {
    return []
  }
}

export function persistCases(cases: CaseRecord[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CASE_STORAGE_KEY, JSON.stringify(cases))
}
