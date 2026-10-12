import { type Database } from './database'

// ─── Core domain types ───────────────────────────────────────────────────────

export type FileRow = Database['public']['Tables']['files']['Row']
export type FolderRow = Database['public']['Tables']['folders']['Row']
export type ShareRow = Database['public']['Tables']['shares']['Row']
export type TransferLogRow = Database['public']['Tables']['transfer_logs']['Row']
export type ExperimentRow = Database['public']['Tables']['experiments']['Row']

export type TransferOperation = Database['public']['Enums']['transfer_operation']

// ─── Transfer states ──────────────────────────────────────────────────────────

export type TransferStatus = 'idle' | 'pending' | 'uploading' | 'verifying' | 'completed' | 'failed' | 'cancelled'

// ─── Integrity ────────────────────────────────────────────────────────────────

export type ChecksumStatus = 'pending' | 'matched' | 'mismatch' | 'skipped'

export interface IntegrityResult {
  status: ChecksumStatus
  computed: string | null
  expected: string | null
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadProgress {
  fileId: string
  fileName: string
  sizeBytes: number
  status: TransferStatus
  checksumStatus: ChecksumStatus
  startedAt: number | null
  completedAt: number | null
  durationMs: number | null
  error: string | null
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

export interface TelemetryEvent {
  requestId: string
  operation: TransferOperation
  statusCode: number | null
  durationMs: number | null
  bytesTransferred: number
  errorCode: string | null
}

export interface TelemetrySummary {
  totalTransfers: number
  totalBytesTransferred: number
  successCount: number
  errorCount: number
  averageDurationMs: number | null
  averageThroughputMibS: number | null
  successRate: number
}

// ─── API responses ────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    message: string
    code?: string
    status?: number
  }
}

export type ApiResult<T> = ApiSuccess<T> | ApiError

// ─── File Manager view model ─────────────────────────────────────────────────

export interface FileEntry {
  id: string
  name: string
  mimeType: string | null
  sizeBytes: number
  checksumSha256: string | null
  storagePath: string
  folderId: string | null
  createdAt: string
  updatedAt: string
}

export interface FolderEntry {
  id: string
  name: string
  parentFolderId: string | null
  createdAt: string
}

export interface BreadcrumbItem {
  id: string | null
  name: string
}

// ─── Share types ──────────────────────────────────────────────────────────────

export type ShareExpiry = '1h' | '24h' | '7d'

export interface ShareLink {
  id: string
  fileId: string
  token: string // raw token — only available at creation time
  expiresAt: string
  revokedAt: string | null
  createdAt: string
}

// ─── Experiment ───────────────────────────────────────────────────────────────

export interface ExperimentParameters {
  fileSizeBytes: number
  runCount: number
  environment: 'loopback' | 'lan' | 'internet'
  notes?: string
}

export interface ExperimentRun {
  run: number
  durationMs: number
  bytesTransferred: number
  throughputMibS: number
  checksumStatus: ChecksumStatus
}

export interface ExperimentResults {
  runs: ExperimentRun[]
  averageDurationMs: number
  averageThroughputMibS: number
  allChecksumsMatched: boolean
}
