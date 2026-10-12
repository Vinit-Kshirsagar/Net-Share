'use client'

import React, { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { computeSha256 } from '@/lib/crypto/sha256'
import { v4 as uuidv4 } from 'uuid'
import { UploadCloud, CheckCircle2, AlertTriangle, X, ShieldAlert, Cpu } from 'lucide-react'
import { formatBytes, formatDuration } from '@/lib/utils'

interface UploadDropzoneProps {
  currentFolderId: string | null
  onUploadSuccess: () => void
}

interface ActiveUpload {
  id: string
  fileName: string
  sizeBytes: number
  progress: number // 0 to 100
  phase: 'hashing' | 'uploading' | 'recording' | 'done' | 'failed' | 'partial_failure'
  sha256: string | null
  durationMs: number | null
  error: string | null
}

export function UploadDropzone({ currentFolderId, onUploadSuccess }: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [activeUploads, setActiveUploads] = useState<ActiveUpload[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    const uploadId = uuidv4()
    const startTime = performance.now()

    const initialUpload: ActiveUpload = {
      id: uploadId,
      fileName: file.name,
      sizeBytes: file.size,
      progress: 5,
      phase: 'hashing',
      sha256: null,
      durationMs: null,
      error: null,
    }

    setActiveUploads((prev) => [initialUpload, ...prev])

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      // 1. Calculate SHA-256 pre-upload
      const sha256 = await computeSha256(file)
      setActiveUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId ? { ...u, sha256, progress: 30, phase: 'uploading' } : u
        )
      )

      // 2. Direct upload to Supabase Storage namespace: {userId}/{fileUuid}-{filename}
      const fileUuid = uuidv4()
      const storagePath = `${user.id}/${fileUuid}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

      const uploadStart = performance.now()
      const { error: storageError } = await supabase.storage
        .from('netshare-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (storageError) {
        throw new Error(`Storage upload failed: ${storageError.message}`)
      }

      const uploadDuration = performance.now() - uploadStart
      setActiveUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId ? { ...u, progress: 85, phase: 'recording' } : u
        )
      )

      // 3. Register metadata in PostgreSQL via API
      const metadataRes = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          storagePath,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          checksumSha256: sha256,
          folderId: currentFolderId,
          durationMs: uploadDuration,
        }),
      })

      const totalDuration = performance.now() - startTime

      if (!metadataRes.ok) {
        const errorJson = await metadataRes.json().catch(() => ({}))
        const errorMsg =
          errorJson?.error?.message || `Metadata creation failed (HTTP ${metadataRes.status})`

        // Partial failure: object in storage, but DB record failed
        setActiveUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? {
                  ...u,
                  phase: 'partial_failure',
                  error: `Partial Failure: File uploaded to storage (${storagePath}), but database metadata failed (${errorMsg}).`,
                }
              : u
          )
        )
        return
      }

      // Upload completely successful
      setActiveUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId
            ? { ...u, progress: 100, phase: 'done', durationMs: totalDuration }
            : u
        )
      )

      onUploadSuccess()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setActiveUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId ? { ...u, phase: 'failed', error: errorMessage } : u
        )
      )
    }
  }

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    Array.from(files).forEach((file) => processFile(file))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const dismissUpload = (id: string) => {
    setActiveUploads((prev) => prev.filter((u) => u.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Dropzone container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-blue-500 bg-blue-500/10 scale-[1.005]'
            : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">
              Drag & drop files here, or <span className="text-blue-400 underline underline-offset-2">browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Direct-to-Storage upload with client-side SHA-256 pre-calculation and monotonic timing
            </p>
          </div>
        </div>
      </div>

      {/* Active and recent uploads progress cards */}
      {activeUploads.length > 0 && (
        <div className="space-y-2">
          {activeUploads.map((upload) => (
            <div
              key={upload.id}
              className={`p-3.5 rounded-lg border text-xs transition-all ${
                upload.phase === 'done'
                  ? 'bg-slate-900/90 border-slate-800 text-slate-200'
                  : upload.phase === 'partial_failure'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : upload.phase === 'failed'
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-slate-900 border-blue-500/30 text-blue-300'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {upload.phase === 'hashing' && (
                    <Cpu className="h-4 w-4 text-blue-400 animate-spin shrink-0" />
                  )}
                  {upload.phase === 'uploading' && (
                    <UploadCloud className="h-4 w-4 text-blue-400 animate-bounce shrink-0" />
                  )}
                  {upload.phase === 'done' && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  )}
                  {upload.phase === 'partial_failure' && (
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                  )}
                  {upload.phase === 'failed' && (
                    <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
                  )}

                  <span className="font-medium truncate text-white">{upload.fileName}</span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    ({formatBytes(upload.sizeBytes)})
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[11px] text-slate-400">
                    {upload.phase === 'hashing' && 'Computing SHA-256...'}
                    {upload.phase === 'uploading' && 'Streaming to Storage...'}
                    {upload.phase === 'recording' && 'Registering DB Metadata...'}
                    {upload.phase === 'done' && `Completed (${formatDuration(upload.durationMs)})`}
                    {upload.phase === 'partial_failure' && 'Partial Failure'}
                    {upload.phase === 'failed' && 'Upload Failed'}
                  </span>
                  <button
                    onClick={() => dismissUpload(upload.id)}
                    className="p-1 rounded text-slate-500 hover:text-slate-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              {upload.phase !== 'done' && upload.phase !== 'failed' && upload.phase !== 'partial_failure' && (
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800 my-1">
                  <div
                    className="bg-blue-500 h-full transition-all duration-300"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}

              {/* Error or SHA-256 info */}
              {upload.sha256 && (
                <div className="text-[10px] font-mono text-slate-500 truncate mt-1">
                  SHA-256: {upload.sha256}
                </div>
              )}

              {upload.error && (
                <div className="text-[11px] mt-1 font-sans text-red-400">
                  {upload.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
