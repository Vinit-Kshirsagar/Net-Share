import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS class names with clsx and tailwind-merge.
 * Resolves Tailwind class conflicts correctly (e.g. `text-red-500 text-blue-500` → `text-blue-500`).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format bytes to a human-readable string (KiB, MiB, GiB).
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * Calculate effective throughput in MiB/s.
 * Returns null if duration is 0 or bytes is 0.
 */
export function calculateThroughputMibS(bytes: number, durationMs: number): number | null {
  if (durationMs <= 0 || bytes <= 0) return null
  const seconds = durationMs / 1000
  const mib = bytes / (1024 * 1024)
  return mib / seconds
}

/**
 * Format throughput with 2 decimal places.
 */
export function formatThroughput(bytes: number, durationMs: number): string {
  const throughput = calculateThroughputMibS(bytes, durationMs)
  if (throughput === null) return '—'
  return `${throughput.toFixed(2)} MiB/s`
}

/**
 * Format duration in ms to a human-readable string.
 */
export function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

/**
 * Truncate a string to maxLength with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 1) + '…'
}

/**
 * Format an ISO date string to a readable local date/time.
 */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Generate a URL-safe storage path for a user's file.
 * Format: {userId}/{uuid}
 */
export function buildStoragePath(userId: string, fileId: string): string {
  return `${userId}/${fileId}`
}

/**
 * Extract file extension from a file name.
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : ''
}

/**
 * Map MIME type to a generic category for display purposes.
 */
export function getFileCategory(mimeType: string | null): 'image' | 'video' | 'audio' | 'document' | 'archive' | 'code' | 'other' {
  if (!mimeType) return 'other'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('spreadsheet') || mimeType.includes('presentation') || mimeType.includes('text/plain')) return 'document'
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip') || mimeType.includes('7z')) return 'archive'
  if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('html') || mimeType.includes('css')) return 'code'
  return 'other'
}
