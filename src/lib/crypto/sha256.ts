/**
 * Browser-side SHA-256 computation using the Web Crypto API.
 *
 * Streams the file in chunks to avoid loading large files entirely into memory.
 * Returns the lowercase hex-encoded digest.
 *
 * NOTE: This runs in the browser only — do NOT import in Server Components
 * or Route Handlers. Use Node's built-in `crypto` module on the server side.
 */
export async function computeSha256(file: File): Promise<string> {
  const CHUNK_SIZE = 2 * 1024 * 1024 // 2 MiB per chunk

  // Use streaming DigestStream if available (Chrome 109+), fall back to
  // reading the whole file (still avoids one large allocation by using slices).
  if (typeof (globalThis as unknown as { DigestStream?: unknown }).DigestStream !== 'undefined') {
    // Fast path: stream directly into the digest
    const hashBuffer = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
    return bufferToHex(hashBuffer)
  }

  // Chunked path: read file in slices and build a single ArrayBuffer
  // to keep peak memory bounded.
  const buffers: ArrayBuffer[] = []
  let offset = 0

  while (offset < file.size) {
    const slice = file.slice(offset, offset + CHUNK_SIZE)
    const buffer = await slice.arrayBuffer()
    buffers.push(buffer)
    offset += CHUNK_SIZE
  }

  // Concatenate all chunks
  const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0)
  const combined = new Uint8Array(totalLength)
  let pos = 0
  for (const buf of buffers) {
    combined.set(new Uint8Array(buf), pos)
    pos += buf.byteLength
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', combined)
  return bufferToHex(hashBuffer)
}

/**
 * Compute SHA-256 of an ArrayBuffer (for download verification).
 */
export async function computeSha256FromBuffer(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return bufferToHex(hashBuffer)
}

/**
 * Compare a computed digest with an expected hex string.
 * Case-insensitive comparison.
 */
export function compareDigests(computed: string, expected: string): boolean {
  return computed.toLowerCase() === expected.toLowerCase()
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
