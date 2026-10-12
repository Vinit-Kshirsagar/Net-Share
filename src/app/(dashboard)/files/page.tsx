'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  FolderPlus,
  RefreshCw,
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  HardDrive,
  Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UploadDropzone } from '@/components/file-manager/upload-dropzone'
import { FolderBreadcrumbs } from '@/components/file-manager/folder-breadcrumbs'
import { FileView } from '@/components/file-manager/file-view'
import { CreateFolderDialog } from '@/components/file-manager/create-folder-dialog'
import { RenameDialog } from '@/components/file-manager/rename-dialog'
import { DeleteConfirmDialog } from '@/components/file-manager/delete-confirm-dialog'
import { FileDetailsSheet } from '@/components/file-manager/file-details-sheet'
import { ShareDialog } from '@/components/file-manager/share-dialog'
import { FileRow, FolderRow, BreadcrumbItem } from '@/types/netshare'

export default function FilesPage() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [folders, setFolders] = useState<FolderRow[]>([])
  const [files, setFiles] = useState<FileRow[]>([])
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

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const folderParam = currentFolderId ? `?parentId=${currentFolderId}` : '?parentId=root'
      const fileFolderParam = currentFolderId ? `?folderId=${currentFolderId}` : '?folderId=root'
      const searchParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''
      const sortParam = `&sortBy=${sortBy}`

      const [foldersRes, filesRes] = await Promise.all([
        fetch(`/api/folders${folderParam}`),
        fetch(`/api/files${fileFolderParam}${searchParam}${sortParam}`),
      ])

      const foldersData = await foldersRes.json()
      const filesData = await filesRes.json()

      setFolders(foldersData.data || [])
      setFiles(filesData.data || [])
    } catch (err) {
      console.error('Failed to load file manager contents:', err)
    } finally {
      setIsLoading(false)
    }
  }, [currentFolderId, searchQuery, sortBy])

  useEffect(() => {
    loadData()
  }, [loadData])

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Top action bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-blue-400" />
            File Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Isolated user namespace backed by private object storage. Direct SHA-256 integrity checks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateFolderOpen(true)}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white text-xs h-9"
          >
            <FolderPlus className="h-4 w-4 mr-1.5 text-amber-400" />
            New Folder
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={loadData}
            className="h-9 w-9 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
            title="Refresh Files"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ─── Direct Storage Upload Dropzone ─────────────────────────────────── */}
      <UploadDropzone
        currentFolderId={currentFolderId}
        onUploadSuccess={loadData}
      />

      {/* ─── Breadcrumbs & Search & View controls ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <FolderBreadcrumbs
          breadcrumbs={breadcrumbs}
          onSelectFolder={handleSelectBreadcrumbFolder}
        />

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>

          {/* List / Grid view toggles */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5 shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="List View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Files & Folders View ───────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-500">
          <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Querying Supabase PostgreSQL metadata...
        </div>
      ) : (
        <FileView
          viewMode={viewMode}
          folders={folders}
          files={files}
          onOpenFolder={handleOpenFolder}
          onSelectFileDetails={(file) => setSelectedFileForDetails(file)}
          onDownloadFile={(file) => setSelectedFileForDetails(file)}
          onShareFile={(file) => setSelectedFileForShare(file)}
          onRenameItem={(item) => setRenameItem(item)}
          onDeleteItem={(item) => setDeleteItem(item)}
        />
      )}

      {/* ─── Modals and Sheets ──────────────────────────────────────────────── */}
      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        currentFolderId={currentFolderId}
        onSuccess={loadData}
      />

      <RenameDialog
        open={!!renameItem}
        onOpenChange={(open) => !open && setRenameItem(null)}
        item={renameItem}
        onSuccess={loadData}
      />

      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        item={deleteItem}
        onSuccess={loadData}
      />

      <FileDetailsSheet
        open={!!selectedFileForDetails}
        onOpenChange={(open) => !open && setSelectedFileForDetails(null)}
        file={selectedFileForDetails}
        onOpenShareModal={(file) => {
          setSelectedFileForDetails(null)
          setSelectedFileForShare(file)
        }}
      />

      <ShareDialog
        open={!!selectedFileForShare}
        onOpenChange={(open) => !open && setSelectedFileForShare(null)}
        file={selectedFileForShare}
      />
    </div>
  )
}
