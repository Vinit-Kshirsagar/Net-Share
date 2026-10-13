'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  FolderPlus,
  RefreshCw,
  Search,
  LayoutGrid,
  List,
  HardDrive,
  Activity,
  Files,
  ShieldCheck,
  Folder,
  Database,
  Network,
  Globe,
  Lock
} from 'lucide-react'
import { UploadDropzone } from '@/components/file-manager/upload-dropzone'
import { FolderBreadcrumbs } from '@/components/file-manager/folder-breadcrumbs'
import { FileView } from '@/components/file-manager/file-view'
import { CreateFolderDialog } from '@/components/file-manager/create-folder-dialog'
import { RenameDialog } from '@/components/file-manager/rename-dialog'
import { DeleteConfirmDialog } from '@/components/file-manager/delete-confirm-dialog'
import { FileDetailsSheet } from '@/components/file-manager/file-details-sheet'
import { ShareDialog } from '@/components/file-manager/share-dialog'
import {
  ProtocolInspectorModal,
  NetworkOperationType,
  ProtocolInspectionContext,
} from '@/components/network/protocol-inspector-modal'
import { FileRow, FolderRow, BreadcrumbItem } from '@/types/netshare'
import { formatBytes } from '@/lib/utils'

export default function FilesPage() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [folders, setFolders] = useState<FolderRow[]>([])
  const [files, setFiles] = useState<FileRow[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine' | 'public'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [sortBy, setSortBy] = useState<'created_at' | 'name' | 'size_bytes'>('created_at')

  // Modals state
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [renameItem, setRenameItem] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null)
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null)
  const [selectedFileForDetails, setSelectedFileForDetails] = useState<FileRow | null>(null)
  const [selectedFileForShare, setSelectedFileForShare] = useState<FileRow | null>(null)

  // Protocol Inspector modal state
  const [protocolInspectorOpen, setProtocolInspectorOpen] = useState(false)
  const [protocolInspectorOp, setProtocolInspectorOp] = useState<NetworkOperationType>('download')
  const [protocolInspectorCtx, setProtocolInspectorCtx] = useState<ProtocolInspectionContext | null>(null)

  const openProtocolInspector = (op: NetworkOperationType, ctx: ProtocolInspectionContext) => {
    setProtocolInspectorOp(op)
    setProtocolInspectorCtx(ctx)
    setProtocolInspectorOpen(true)
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const folderParam = currentFolderId ? `?parentId=${currentFolderId}` : '?parentId=root'
      const fileFolderParam = currentFolderId ? `?folderId=${currentFolderId}` : '?folderId=root'
      const searchParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''
      const sortParam = `&sortBy=${sortBy}`
      const scopeParam = `&scope=${scopeFilter}`

      const [foldersRes, filesRes] = await Promise.all([
        fetch(`/api/folders${folderParam}`),
        fetch(`/api/files${fileFolderParam}${searchParam}${sortParam}${scopeParam}`),
      ])

      const foldersData = await foldersRes.json()
      const filesData = await filesRes.json()

      setFolders(foldersData.data || [])
      setFiles(filesData.data || [])
      if (filesData.currentUserId) {
        setCurrentUserId(filesData.currentUserId)
      }
    } catch (err) {
      console.error('Failed to load file manager contents:', err)
    } finally {
      setIsLoading(false)
    }
  }, [currentFolderId, searchQuery, sortBy, scopeFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalBytes = useMemo(() => {
    return files.reduce((acc, f) => acc + (Number(f.size_bytes) || 0), 0)
  }, [files])

  const verifiedCount = useMemo(() => {
    return files.filter((f) => !!f.checksum_sha256).length
  }, [files])

  const handleOpenFolder = (folderId: string) => {
    const clickedFolder = folders.find((f) => f.id === folderId)
    if (clickedFolder) {
      setBreadcrumbs((prev) => [...prev, { id: folderId, name: clickedFolder.name }])
    }
    setCurrentFolderId(folderId)
  }

  const handleSelectBreadcrumbFolder = (folderId: string | null) => {
    if (folderId === null) {
      setBreadcrumbs([])
      setCurrentFolderId(null)
    } else {
      const idx = breadcrumbs.findIndex((b) => b.id === folderId)
      if (idx !== -1) {
        setBreadcrumbs(breadcrumbs.slice(0, idx + 1))
      }
      setCurrentFolderId(folderId)
    }
  }

  // ── Download: capture real RTT then open Protocol Inspector ──────────────
  const handleDownloadFile = async (file: FileRow) => {
    const downloadStart = performance.now()
    try {
      const res = await fetch(`/api/files/${file.id}/download`)
      const durationMs = performance.now() - downloadStart

      if (res.ok) {
        const json = await res.json()
        if (json?.data?.signedUrl) {
          window.open(json.data.signedUrl, '_blank')
        }
      } else {
        window.open(`/api/files/${file.id}/download`, '_blank')
      }

      // Show protocol inspector with real timing
      openProtocolInspector('download', {
        fileName: file.name,
        fileSize: file.size_bytes,
        mimeType: file.mime_type ?? undefined,
        checksumSha256: file.checksum_sha256 ?? undefined,
        durationMs,
        statusCode: res.status,
        requestId: file.id,
      })
    } catch {
      window.open(`/api/files/${file.id}/download`, '_blank')
    }
  }

  return (
    <div className="space-y-12 animate-fade-in">
      {/* ─── Symmetrical Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/[0.1] pb-10">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-[11px] font-bold text-white uppercase tracking-[0.4em]">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Encrypted Namespace · L7 Storage Pipeline</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tightest leading-tight text-white">
            Cryptographic <span className="text-white/40 italic">Storage Explorer.</span>
          </h1>

          <p className="text-base font-medium text-white/50 max-w-2xl leading-relaxed">
            Multi-user storage isolated by PostgreSQL Row-Level Security. Transfers stream directly to object storage with client-side SHA-256 integrity validation.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Protocol Inspector quick-launch */}
          <button
            onClick={() =>
              openProtocolInspector('listing', {
                statusCode: 200,
              })
            }
            className="linear-button-secondary h-11 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2"
            title="Open Protocol Inspector"
          >
            <Network className="w-4 h-4" />
            <span className="hidden sm:inline">Protocols</span>
          </button>

          <button
            onClick={() => setCreateFolderOpen(true)}
            className="linear-button-primary h-11 px-5 rounded-xl font-bold text-xs uppercase tracking-wider"
          >
            <FolderPlus className="w-4 h-4 mr-1.5" /> New Folder
          </button>

          <button
            onClick={loadData}
            className="linear-button-secondary h-11 px-4 rounded-xl text-xs uppercase tracking-wider"
            title="Refresh Storage"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── 4-Column Metric Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="linear-card p-6 flex items-center gap-5 hover:border-white/20 transition-all">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 text-white">
            <Files className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Total Files</p>
            <div className="text-3xl font-black text-white tracking-tight">{files.length}</div>
          </div>
        </div>

        <div className="linear-card p-6 flex items-center gap-5 hover:border-white/20 transition-all">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 text-white">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Storage Used</p>
            <div className="text-3xl font-black text-white tracking-tight">{formatBytes(totalBytes)}</div>
          </div>
        </div>

        <div className="linear-card p-6 flex items-center gap-5 hover:border-white/20 transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">SHA-256 Verified</p>
            <div className="text-3xl font-black text-white tracking-tight">{verifiedCount}</div>
          </div>
        </div>

        <div className="linear-card p-6 flex items-center gap-5 hover:border-white/20 transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
            <Folder className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Folder Nodes</p>
            <div className="text-3xl font-black text-white tracking-tight">{folders.length}</div>
          </div>
        </div>
      </div>

      {/* ─── Upload Dropzone ─────────────────────────────────────────────────── */}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-white/40 uppercase tracking-[0.25em]">
            Upload Pipeline — Direct to Object Storage
          </span>
          <Database className="h-3.5 w-3.5 text-white/20" />
        </div>
        <UploadDropzone currentFolderId={currentFolderId} onUploadSuccess={loadData} />
      </div>

      {/* ─── Breadcrumb navigation ───────────────────────────────────────────── */}
      {breadcrumbs.length > 0 && (
        <FolderBreadcrumbs
          breadcrumbs={breadcrumbs}
          onSelectFolder={handleSelectBreadcrumbFolder}
        />
      )}

      {/* ─── Scope Filter Tabs & Controls ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Scope Selector: All · My Files · Public Network */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.02] border border-white/[0.08] shrink-0">
          <button
            onClick={() => setScopeFilter('all')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              scopeFilter === 'all'
                ? 'bg-white text-black shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <span>All Accessible</span>
          </button>

          <button
            onClick={() => setScopeFilter('mine')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              scopeFilter === 'mine'
                ? 'bg-white text-black shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>My Namespace</span>
          </button>

          <button
            onClick={() => setScopeFilter('public')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              scopeFilter === 'public'
                ? 'bg-cyan-400 text-black shadow-sm'
                : 'text-cyan-400/80 hover:text-cyan-300'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Public Network</span>
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1 max-w-xl ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-9 px-3 text-xs font-bold rounded-xl bg-white/[0.03] border border-white/10 text-white/70 focus:outline-none focus:border-white/40 transition-all shrink-0"
          >
            <option value="created_at">Sort: Upload Date</option>
            <option value="name">Sort: Name A–Z</option>
            <option value="size_bytes">Sort: File Size</option>
          </select>

          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <input
              placeholder="Search by file name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-xs font-medium rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-all"
            />
          </div>

          <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-1 shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-white/40 hover:text-white'
              }`}
              title="List View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-white/40 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── File & Folder Content View ─────────────────────────────────────── */}
      <FileView
        viewMode={viewMode}
        folders={scopeFilter === 'public' ? [] : folders}
        files={files}
        currentUserId={currentUserId}
        onOpenFolder={handleOpenFolder}
        onSelectFileDetails={(file) => setSelectedFileForDetails(file)}
        onDownloadFile={handleDownloadFile}
        onShareFile={(file) => setSelectedFileForShare(file)}
        onRenameItem={(item) => setRenameItem(item)}
        onDeleteItem={(item) => setDeleteItem(item)}
        onTogglePublic={async (file, nextValue) => {
          try {
            const res = await fetch(`/api/files/${file.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isPublic: nextValue }),
            })
            if (res.ok) loadData()
          } catch { /* ignore */ }
        }}
      />

      {/* ─── Modals & Sheets ─────────────────────────────────────────────────── */}
      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        currentFolderId={currentFolderId}
        onSuccess={loadData}
      />

      {renameItem && (
        <RenameDialog
          open={!!renameItem}
          onOpenChange={(open) => !open && setRenameItem(null)}
          item={renameItem}
          onSuccess={loadData}
        />
      )}

      {deleteItem && (
        <DeleteConfirmDialog
          open={!!deleteItem}
          onOpenChange={(open) => !open && setDeleteItem(null)}
          item={deleteItem}
          onSuccess={loadData}
        />
      )}

      {selectedFileForDetails && (
        <FileDetailsSheet
          open={!!selectedFileForDetails}
          onOpenChange={(open) => !open && setSelectedFileForDetails(null)}
          file={selectedFileForDetails}
          onOpenShareModal={(file) => {
            setSelectedFileForDetails(null)
            setSelectedFileForShare(file)
          }}
        />
      )}

      {selectedFileForShare && (
        <ShareDialog
          open={!!selectedFileForShare}
          onOpenChange={(open) => !open && setSelectedFileForShare(null)}
          file={selectedFileForShare}
          onFileUpdated={(_updatedFile) => loadData()}
        />
      )}

      {/* ─── Protocol Inspector Modal ─────────────────────────────────────────── */}
      <ProtocolInspectorModal
        open={protocolInspectorOpen}
        onOpenChange={setProtocolInspectorOpen}
        initialOperation={protocolInspectorOp}
        contextData={protocolInspectorCtx}
      />
    </div>
  )
}
