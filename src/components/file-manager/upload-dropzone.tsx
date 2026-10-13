'use client'

import React, { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { computeSha256 } from '@/lib/crypto/sha256'
import { v4 as uuidv4 } from 'uuid'
import { Upload, CheckCircle2, AlertTriangle, X, ShieldAlert, Cpu, ArrowUpRight, Network } from 'lucide-react'
import { formatBytes, formatDuration } from '@/lib/utils'
import {
  ProtocolInspectorModal,
  ProtocolInspectionContext,
} from '@/components/network/protocol-inspector-modal'

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
  // store protocol context for the inspector
  inspectionContext: ProtocolInspectionContext | null
}

export function UploadDropzone({ currentFolderId, onUploadSuccess }: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [activeUploads, setActiveUploads] = useState<ActiveUpload[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Protocol Inspector modal state
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorContext, setInspectorContext] = useState<ProtocolInspectionContext | null>(null)

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
      inspectionContext: null,
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
        if (storageError.message?.toLowerCase().includes('bucket not found')) {
          throw new Error("Storage bucket 'netshare-files' does not exist yet. Please run migration 0002_storage_policies.sql in your Supabase SQL Editor.")
        }
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

      // Build protocol inspection context for this upload
      const ctx: ProtocolInspectionContext = {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        checksumSha256: sha256,
        durationMs: totalDuration,
        statusCode: 201,
        requestId: fileUuid,
      }

      // Upload completely successful
      setActiveUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId
            ? { ...u, progress: 100, phase: 'done', durationMs: totalDuration, inspectionContext: ctx }
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

  const openInspector = (ctx: ProtocolInspectionContext) => {
    setInspectorContext(ctx)
    setInspectorOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Dropzone container matching compliance-checker FileUploadZone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full h-56 sm:h-64 rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer group ${
          isDragOver
            ? 'border-white/50 bg-white/[0.08] shadow-[0_0_40px_rgba(255,255,255,0.06)]'
            : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-white/[0.04] text-white/40 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 border border-white/10 group-hover:border-white/30 group-hover:text-white">
            <Upload className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <p className="text-[15px] font-bold text-white tracking-tight">
              Drop files to stream directly to storage
            </p>
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
              OR CLICK TO BROWSE LOCAL FILES • AUTOMATIC SHA-256 DIGEST
            </p>
          </div>
        </div>

        {/* Security badges at bottom */}
        <div className="absolute bottom-5 left-0 right-0 flex justify-center space-x-6 opacity-30 group-hover:opacity-70 transition-opacity">
          <div className="flex items-center space-x-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[9px] font-bold text-white uppercase tracking-widest">L7 DIRECT STREAM</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
            <span className="text-[9px] font-bold text-white uppercase tracking-widest">SHA-256 PRE-COMPUTED</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span className="text-[9px] font-bold text-white uppercase tracking-widest">RLS ISOLATED</span>
          </div>
        </div>
      </div>

      {/* Active and recent uploads progress cards */}
      {activeUploads.length > 0 && (
        <div className="space-y-2.5">
          {activeUploads.map((upload) => (
            <div
              key={upload.id}
              className={`p-4 rounded-xl border transition-all text-xs ${
                upload.phase === 'done'
                  ? 'bg-neutral-900/90 border-white/10 text-white'
                  : upload.phase === 'partial_failure'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : upload.phase === 'failed'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  : 'bg-neutral-900 border-white/20 text-white'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {upload.phase === 'hashing' && (
                    <Cpu className="h-4 w-4 text-white animate-spin shrink-0" />
                  )}
                  {upload.phase === 'uploading' && (
                    <Upload className="h-4 w-4 text-white animate-bounce shrink-0" />
                  )}
                  {upload.phase === 'done' && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  )}
                  {upload.phase === 'partial_failure' && (
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                  )}
                  {upload.phase === 'failed' && (
                    <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
                  )}

                  <span className="font-bold truncate text-white">{upload.fileName}</span>
                  <span className="text-white/40 font-mono text-[11px]">
                    ({formatBytes(upload.sizeBytes)})
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="font-mono text-[11px] text-white/50 uppercase">
                    {upload.phase === 'hashing' && 'Computing SHA-256...'}
                    {upload.phase === 'uploading' && 'Streaming L7 Chunks...'}
                    {upload.phase === 'recording' && 'Registering DB Metadata...'}
                    {upload.phase === 'done' && `Verified (${formatDuration(upload.durationMs)})`}
                    {upload.phase === 'partial_failure' && 'Partial Failure'}
                    {upload.phase === 'failed' && 'Upload Failed'}
                  </span>
                  <button
                    onClick={() => dismissUpload(upload.id)}
                    className="p-1 rounded text-white/40 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              {upload.phase !== 'done' && upload.phase !== 'failed' && upload.phase !== 'partial_failure' && (
                <div className="w-full bg-white/[0.05] rounded-full h-1 overflow-hidden border border-white/10 my-2">
                  <div
                    className="bg-white h-full transition-all duration-300"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}

              {/* SHA-256 info */}
              {upload.sha256 && (
                <div className="text-[10px] font-mono text-white/40 truncate mt-1">
                  SHA-256: {upload.sha256}
                </div>
              )}

              {upload.error && (
                <div className="text-[11px] mt-1 text-rose-300">
                  {upload.error}
                </div>
              )}

              {/* ── "Inspect Protocols" button shown only on successful done uploads ── */}
              {upload.phase === 'done' && upload.inspectionContext && (
                <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
                    Full upload telemetry captured
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openInspector(upload.inspectionContext!)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-white text-[11px] font-bold hover:bg-white/[0.12] hover:border-white/20 transition-all"
                  >
                    <Network className="h-3.5 w-3.5" />
                    Inspect Protocols
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Protocol Inspector Modal */}
      <ProtocolInspectorModal
        open={inspectorOpen}
        onOpenChange={setInspectorOpen}
        initialOperation="upload"
        contextData={inspectorContext}
      />
    </div>
  )
}
