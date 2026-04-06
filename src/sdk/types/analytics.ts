export type ExperimentCondition = "manual" | "rule" | "enhanced"

export type ExperimentSource = "popup" | "history" | "manual"

export type ExperimentPageType =
  | "structured"
  | "semi-structured"
  | "high-noise"
  | "unknown"

export interface ExperimentEvent {
  id: string
  createdAt: string
  condition: ExperimentCondition
  source: ExperimentSource
  pageTitle?: string
  url?: string
  domain?: string
  folderPath?: string
  pageType?: ExperimentPageType
  steps: number
  latencyMs: number
  suggestionCount: number
  selectedRank?: number
  top1Accepted: boolean
  top3Covered: boolean
  recommendedPaths: string[]
  explanationSatisfaction?: number
  interventionSatisfaction?: number
  notes?: string
}

export interface RecordExperimentEventPayload {
  condition: ExperimentCondition
  source: ExperimentSource
  pageTitle?: string
  url?: string
  domain?: string
  folderPath?: string
  pageType?: ExperimentPageType
  steps: number
  latencyMs: number
  suggestionCount?: number
  selectedRank?: number
  top1Accepted?: boolean
  top3Covered?: boolean
  recommendedPaths?: string[]
  explanationSatisfaction?: number
  interventionSatisfaction?: number
  notes?: string
}
