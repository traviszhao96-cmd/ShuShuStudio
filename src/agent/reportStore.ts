import type { TopicName } from '../analysis/types'

export type TopicReport = {
  headline: string
  content: string
  parsed?: { headline: string; sections: Array<{ conclusion: string; facts: string }> }
}

export type ReportSources = {
  ziwei: Record<string, string>
  bazi: Record<string, string>
  merged: Record<string, TopicReport>
}

export type AgentReport = {
  id: string
  caseId: string
  generatedAt: number
  version: string
  topics: Record<TopicName, TopicReport>
  sources?: ReportSources
}

const STORAGE_KEY = 'ssmaster-agent-reports'

function makeReportId() {
  return `rpt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function loadReports(): AgentReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveReports(reports: AgentReport[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
}

export function saveReport(
  caseId: string,
  version: string,
  topics: Record<string, TopicReport>,
  sources?: ReportSources,
): AgentReport {
  const reports = loadReports()
  const report: AgentReport = {
    id: makeReportId(),
    caseId,
    generatedAt: Date.now(),
    version,
    topics: topics as Record<TopicName, TopicReport>,
    sources,
  }
  reports.push(report)
  saveReports(reports)
  return report
}

export function getLatestReport(caseId: string): AgentReport | null {
  const reports = loadReports()
  const matching = reports.filter((r) => r.caseId === caseId)
  if (matching.length === 0) return null
  matching.sort((a, b) => b.generatedAt - a.generatedAt)
  return matching[0]
}

export function getReportsForCase(caseId: string): AgentReport[] {
  return loadReports()
    .filter((r) => r.caseId === caseId)
    .sort((a, b) => b.generatedAt - a.generatedAt)
}

export function deleteReport(reportId: string) {
  const reports = loadReports().filter((r) => r.id !== reportId)
  saveReports(reports)
}
