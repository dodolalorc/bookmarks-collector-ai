export interface PageContext {
  title: string
  url: string
  domain: string
  description?: string
  summary?: string
  author?: string
  siteName?: string
  publishedAt?: string
}

export interface CapturePageResponse {
  page: PageContext
  selectionText?: string
  snippets: CapturedSnippet[]
  extractedAt: string
}

export interface CapturedSnippet {
  id: string
  mode: "selection" | "element"
  text: string
  label: string
  selector?: string
  createdAt: string
  analysisSummary?: string
  analysisTags?: string[]
  analysisUpdatedAt?: string
}

export interface PageCaptureDraft {
  url: string
  snippets: CapturedSnippet[]
  updatedAt: string
}

export interface ExtensionPageOpenPayload {
  path: string
}

export interface PageDigestRequest {
  page: PageContext
  content: string
  prompt?: string
  providerId?: string
}

export interface PageDigestResult {
  modelLabel: string
  providerId: string
  content: string
  tokenEstimate: number
}
