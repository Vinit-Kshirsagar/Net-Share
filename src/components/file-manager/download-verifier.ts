import { computeSha256FromBuffer, compareDigests } from '@/lib/crypto/sha256'
import { v4 as uuidv4 } from 'uuid'
import { FileRow, IntegrityResult } from '@/types/netshare'

export interface DownloadResult {
  integrity: IntegrityResult
  durationMs: number
  bytesTransferred: number
  throughputMibS: number | null
}

/**
 * Downloads a file from the server via authorized signed URL,
 * independently recomputes its SHA-256 digest in the browser,
 * verifies integrity, sends telemetry, and triggers file save.
 */
export async function downloadAndVerifyFile(
  file: FileRow,
  onProgress?: (status: string) => void
): Promise<DownloadResult> {
  const requestId = uuidv4()
  const startTime = performance.now()

  onProgress?.('Requesting authorized download URL...')

  // 1. Get signed URL from API
  const res = await fetch(`/api/files/${file.id}/download`)
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}))
    throw new Error(errorJson?.error?.message || `Failed to initiate download (HTTP ${res.status})`)
  }
  const { data } = await res.json()
  const signedUrl: string = data.signedUrl

  onProgress?.('Streaming bytes from storage...')

  // 2. Fetch file bytes
  const fetchStart = performance.now()
  const response = await fetch(signedUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch file payload (HTTP ${response.status})`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const fetchDuration = performance.now() - fetchStart
  const totalDuration = performance.now() - startTime
  const bytesTransferred = arrayBuffer.byteLength

  onProgress?.('Calculating independent SHA-256 checksum...')

  // 3. Independent SHA-256 integrity check
  const computedHash = await computeSha256FromBuffer(arrayBuffer)
  const isMatch = file.checksum_sha256
    ? compareDigests(computedHash, file.checksum_sha256)
    : true

  const integrity: IntegrityResult = {
    status: file.checksum_sha256 ? (isMatch ? 'matched' : 'mismatch') : 'skipped',
    computed: computedHash,
    expected: file.checksum_sha256,
  }

  // 4. Calculate effective throughput
  const seconds = totalDuration / 1000
  const throughputMibS = seconds > 0 ? (bytesTransferred / (1024 * 1024)) / seconds : null

  // 5. Send telemetry log asynchronously
  fetch('/api/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestId,
      operation: 'download',
      statusCode: response.status,
      durationMs: totalDuration,
      bytesTransferred,
      errorCode: isMatch ? null : 'ERR_CHECKSUM_MISMATCH',
    }),
  }).catch((err) => console.warn('Telemetry dispatch error:', err))

  onProgress?.('Triggering browser save...')

  // 6. Trigger browser download save
  const blob = new Blob([arrayBuffer], { type: file.mime_type || 'application/octet-stream' })
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)

  return {
    integrity,
    durationMs: totalDuration,
    bytesTransferred,
    throughputMibS,
  }
}
