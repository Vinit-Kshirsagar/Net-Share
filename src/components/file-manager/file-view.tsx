'use client'

import React from 'react'
import {
  Folder,
  FileText,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Video,
  Music,
  MoreVertical,
  Download,
  Share2,
  Edit2,
  Trash2,
  Info,
  ShieldCheck,
  FolderOpen
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileRow, FolderRow } from '@/types/netshare'
import { formatBytes, formatDate, getFileCategory } from '@/lib/utils'

interface FileViewProps {
  viewMode: 'grid' | 'list'
  folders: FolderRow[]
  files: FileRow[]
  onOpenFolder: (folderId: string) => void
  onSelectFileDetails: (file: FileRow) => void
  onDownloadFile: (file: FileRow) => void
  onShareFile: (file: FileRow) => void
  onRenameItem: (item: { id: string; name: string; type: 'file' | 'folder' }) => void
  onDeleteItem: (item: { id: string; name: string; type: 'file' | 'folder' }) => void
}

function getFileIcon(mimeType: string | null) {
  const category = getFileCategory(mimeType)
  switch (category) {
    case 'image':
      return <ImageIcon className="h-4 w-4 text-emerald-400" />
    case 'video':
      return <Video className="h-4 w-4 text-purple-400" />
    case 'audio':
      return <Music className="h-4 w-4 text-pink-400" />
    case 'archive':
      return <FileArchive className="h-4 w-4 text-amber-400" />
    case 'code':
      return <FileCode className="h-4 w-4 text-cyan-400" />
    default:
      return <FileText className="h-4 w-4 text-blue-400" />
  }
}

export function FileView({
  viewMode,
  folders,
  files,
  onOpenFolder,
  onSelectFileDetails,
  onDownloadFile,
  onShareFile,
  onRenameItem,
  onDeleteItem,
}: FileViewProps) {
  const isEmpty = folders.length === 0 && files.length === 0

  if (isEmpty) {
    return (
      <div className="py-16 px-4 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
        <div className="h-12 w-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto mb-3">
          <FolderOpen className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-white">This folder is empty</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
          Drop files above to upload directly to private storage, or click &ldquo;New Folder&rdquo; to organize your data.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Folders Section ──────────────────────────────────────────────── */}
      {folders.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
            Folders ({folders.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="group relative p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 flex items-center justify-between transition-all cursor-pointer"
                onClick={() => onOpenFolder(folder.id)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <Folder className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium text-slate-200 truncate group-hover:text-white">
                    {folder.name}
                  </span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    onClick={(e) => e.stopPropagation()}
                    className="h-6 w-6 rounded-md hover:bg-slate-800 text-slate-500 hover:text-slate-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onRenameItem({ id: folder.id, name: folder.name, type: 'folder' })
                      }}
                      className="cursor-pointer gap-2"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-800" />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteItem({ id: folder.id, name: folder.name, type: 'folder' })
                      }}
                      className="cursor-pointer gap-2 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Files Section ────────────────────────────────────────────────── */}
      {files.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
            Files ({files.length})
          </h3>

          {viewMode === 'list' ? (
            /* List / Table View */
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Size</th>
                    <th className="py-3 px-4 hidden md:table-cell">SHA-256 Checksum</th>
                    <th className="py-3 px-4 hidden lg:table-cell">Uploaded</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {files.map((file) => (
                    <tr
                      key={file.id}
                      onClick={() => onSelectFileDetails(file)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                            {getFileIcon(file.mime_type)}
                          </div>
                          <div className="truncate">
                            <span className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                              {file.name}
                            </span>
                            <span className="sm:hidden block text-[10px] text-slate-500 font-mono">
                              {formatBytes(file.size_bytes)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 hidden sm:table-cell font-mono text-slate-400">
                        {formatBytes(file.size_bytes)}
                      </td>

                      <td className="py-3 px-4 hidden md:table-cell">
                        {file.checksum_sha256 ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span>{file.checksum_sha256.substring(0, 12)}...</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 hidden lg:table-cell text-slate-500">
                        {formatDate(file.created_at)}
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDownloadFile(file)}
                            className="h-7 px-2 text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Download & Verify"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-7 w-7 p-0 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                              <DropdownMenuItem onClick={() => onSelectFileDetails(file)} className="cursor-pointer gap-2">
                                <Info className="h-3.5 w-3.5" /> View Technical Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onShareFile(file)} className="cursor-pointer gap-2">
                                <Share2 className="h-3.5 w-3.5" /> Share Expiring Link
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onRenameItem({ id: file.id, name: file.name, type: 'file' })}
                                className="cursor-pointer gap-2"
                              >
                                <Edit2 className="h-3.5 w-3.5" /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-800" />
                              <DropdownMenuItem
                                onClick={() => onDeleteItem({ id: file.id, name: file.name, type: 'file' })}
                                className="cursor-pointer gap-2 text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => onSelectFileDetails(file)}
                  className="group relative p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 flex flex-col justify-between transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                      {getFileIcon(file.mime_type)}
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-7 w-7 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 flex items-center justify-center">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                          <DropdownMenuItem onClick={() => onSelectFileDetails(file)} className="cursor-pointer gap-2">
                            <Info className="h-3.5 w-3.5" /> Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDownloadFile(file)} className="cursor-pointer gap-2">
                            <Download className="h-3.5 w-3.5" /> Download & Verify
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onShareFile(file)} className="cursor-pointer gap-2">
                            <Share2 className="h-3.5 w-3.5" /> Share Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onRenameItem({ id: file.id, name: file.name, type: 'file' })}
                            className="cursor-pointer gap-2"
                          >
                            <Edit2 className="h-3.5 w-3.5" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-800" />
                          <DropdownMenuItem
                            onClick={() => onDeleteItem({ id: file.id, name: file.name, type: 'file' })}
                            className="cursor-pointer gap-2 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors truncate" title={file.name}>
                      {file.name}
                    </h4>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-1">
                      <span>{formatBytes(file.size_bytes)}</span>
                      {file.checksum_sha256 && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                          <ShieldCheck className="h-3 w-3" /> SHA-256
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
