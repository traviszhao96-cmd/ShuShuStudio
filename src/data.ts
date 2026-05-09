import { caseRecords, defaultCase } from './data/cases.generated'

export const caseGroups = ['全部', '家人', '同学', '同事', '名人', '朋友', '评测'] as const

export type CaseGroupFilter = (typeof caseGroups)[number]

export { caseRecords, defaultCase }
