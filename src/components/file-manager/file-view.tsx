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
  FolderOpen,
  Globe,
  Lock,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FileRow, FolderRow } from '@/types/netshare'
import { formatBytes, formatDate, getFileCategory } from '@/lib/utils'

interface FileViewProps {
  viewMode: 'grid' | 'list'
  folders: FolderRow[]
  files: FileRow[]
  currentUserId?: string | null
  onOpenFolder: (folderId: string) => void
  onSelectFileDetails: (file: FileRow) => void
  onDownloadFile: (file: FileRow) => void
  onShareFile: (file: FileRow) => void
  onRenameItem: (item: { id: string; name: string; type: 'file' | 'folder' }) => void
  onDeleteItem: (item: { id: string; name: string; type: 'file' | 'folder' }) => void
  onTogglePublic?: (file: FileRow, nextValue: boolean) => void
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
      return <FileText className="h-4 w-4 text-white/80" />
  }
}

export function FileView({
  viewMode,
  folders,
  files,
  currentUserId,
  onOpenFolder,
  onSelectFileDetails,
  onDownloadFile,
  onShareFile,
  onRenameItem,
  onDeleteItem,
  onTogglePublic,
}: FileViewProps) {
  const isEmpty = folders.length === 0 && files.length === 0

  if (isEmpty) {
    return (
      <div className="py-20 px-8 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
        <div className="h-16 w-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/40 mx-auto mb-4">
          <FolderOpen className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">Namespace is empty</h3>
        <p className="text-sm font-medium text-white/40 max-w-sm mx-auto mt-1 leading-relaxed">
          Drop files above to stream directly to isolated storage, or create a folder to organize your data.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ─── Folders Section ──────────────────────────────────────────────── */}
      {folders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
              Folders ({folders.length})
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="group relative p-3.5 rounded-xl border border-white/[0.08] bg-[#111111] hover:border-white/30 flex items-center justify-between transition-all cursor-pointer shadow-sm"
                onClick={() => onOpenFolder(folder.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <Folder className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-white/80 truncate group-hover:text-white transition-colors">
                    {folder.name}
                  </span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    onClick={(e) => e.stopPropagation()}
                    className="h-6 w-6 rounded-md hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#111111] border border-white/10 text-white text-xs">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onRenameItem({ id: folder.id, name: folder.name, type: 'folder' })
                      }}
                      className="cursor-pointer gap-2 hover:bg-white/10"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteItem({ id: folder.id, name: folder.name, type: 'folder' })
                      }}
                      className="cursor-pointer gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
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
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
              Files ({files.length})
            </h3>
          </div>

          {viewMode === 'list' ? (
            /* Table View */
            <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden shadow-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/[0.08] text-white/40 font-bold uppercase text-[10px] tracking-[0.2em]">
                  <tr>
                    <th className="py-3.5 px-5">File Object</th>
                    <th className="py-3.5 px-5 hidden sm:table-cell">Payload Size</th>
                    <th className="py-3.5 px-5 hidden md:table-cell">SHA-256 Digest</th>
                    <th className="py-3.5 px-5 hidden lg:table-cell">Visibility</th>
                    <th className="py-3.5 px-5 hidden lg:table-cell">Timestamp</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {files.map((file) => {
                    const isOwner = !currentUserId || file.owner_id === currentUserId
                    return (
                      <tr
                        key={file.id}
                        onClick={() => onSelectFileDetails(file)}
                        className="hover:bg-white/[0.03] cursor-pointer transition-colors group"
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center shrink-0">
                              {getFileIcon(file.mime_type)}
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white group-hover:text-white transition-colors">
                                  {file.name}
                                </span>
                                {/* Public badge inline */}
                                {file.is_public && (
                                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-bold uppercase tracking-wider shrink-0">
                                    <Globe className="h-2.5 w-2.5" /> {isOwner ? 'Public' : 'Public Peer'}
                                  </span>
                                )}
                              </div>
                              <span className="sm:hidden block text-[10px] text-white/40 font-mono mt-0.5">
                                {formatBytes(file.size_bytes)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-5 hidden sm:table-cell font-mono text-white/60">
                          {formatBytes(file.size_bytes)}
                        </td>

                        <td className="py-3.5 px-5 hidden md:table-cell">
                          {file.checksum_sha256 ? (
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-white/70">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                              <span>{file.checksum_sha256.substring(0, 14)}...</span>
                            </div>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>

                        {/* Visibility column */}
                        <td className="py-3.5 px-5 hidden lg:table-cell">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            file.is_public
                              ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                              : 'bg-white/[0.03] border border-white/[0.07] text-white/30'
                          }`}>
                            {file.is_public
                              ? <><Globe className="h-3 w-3" /> {isOwner ? 'Public' : 'Public Peer'}</>
                              : <><Lock className="h-3 w-3" /> Private</>
                            }
                          </div>
                        </td>

                        <td className="py-3.5 px-5 hidden lg:table-cell text-white/40 font-mono text-[11px]">
                          {formatDate(file.created_at)}
                        </td>

                        <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onDownloadFile(file)}
                              className="h-8 px-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all"
                              title="Download & Verify"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>

                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-all">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[#111111] border border-white/10 text-white text-xs">
                                <DropdownMenuItem onClick={() => onSelectFileDetails(file)} className="cursor-pointer gap-2 hover:bg-white/10">
                                  <Info className="h-3.5 w-3.5" /> Technical Telemetry
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDownloadFile(file)} className="cursor-pointer gap-2 hover:bg-white/10">
                                  <Download className="h-3.5 w-3.5" /> Download & Verify
                                </DropdownMenuItem>

                                {isOwner && (
                                  <>
                                    <DropdownMenuItem onClick={() => onShareFile(file)} className="cursor-pointer gap-2 hover:bg-white/10">
                                      <Share2 className="h-3.5 w-3.5" /> Share / Visibility
                                    </DropdownMenuItem>
                                    {onTogglePublic && (
                                      <DropdownMenuItem
                                        onClick={() => onTogglePublic(file, !file.is_public)}
                                        className={`cursor-pointer gap-2 ${
                                          file.is_public
                                            ? 'text-white/60 hover:bg-white/10'
                                            : 'text-cyan-400 hover:bg-cyan-500/10'
                                        }`}
                                      >
                                        {file.is_public
                                          ? <><Lock className="h-3.5 w-3.5" /> Make Private</>
                                          : <><Globe className="h-3.5 w-3.5" /> Make Public</>
                                        }
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => onRenameItem({ id: file.id, name: file.name, type: 'file' })}
                                      className="cursor-pointer gap-2 hover:bg-white/10"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" /> Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-white/10" />
                                    <DropdownMenuItem
                                      onClick={() => onDeleteItem({ id: file.id, name: file.name, type: 'file' })}
                                      className="cursor-pointer gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" /> Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {files.map((file) => {
                const isOwner = !currentUserId || file.owner_id === currentUserId
                return (
                  <div
                    key={file.id}
                    onClick={() => onSelectFileDetails(file)}
                    className="linear-card p-4 hover:border-white/30 flex flex-col justify-between transition-all cursor-pointer space-y-4 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                          {getFileIcon(file.mime_type)}
                        </div>
                        {/* Public dot */}
                        {file.is_public && (
                          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-[#111] flex items-center justify-center ${isOwner ? 'bg-cyan-500' : 'bg-cyan-400'}`}>
                            <Globe className="h-2 w-2 text-white" />
                          </div>
                        )}
                      </div>

                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-7 w-7 rounded-lg hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-all">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#111111] border border-white/10 text-white text-xs">
                            <DropdownMenuItem onClick={() => onSelectFileDetails(file)} className="cursor-pointer gap-2 hover:bg-white/10">
                              <Info className="h-3.5 w-3.5" /> Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDownloadFile(file)} className="cursor-pointer gap-2 hover:bg-white/10">
                              <Download className="h-3.5 w-3.5" /> Download & Verify
                            </DropdownMenuItem>

                            {isOwner && (
                              <>
                                <DropdownMenuItem onClick={() => onShareFile(file)} className="cursor-pointer gap-2 hover:bg-white/10">
                                  <Share2 className="h-3.5 w-3.5" /> Share / Visibility
                                </DropdownMenuItem>
                                {onTogglePublic && (
                                  <DropdownMenuItem
                                    onClick={() => onTogglePublic(file, !file.is_public)}
                                    className={`cursor-pointer gap-2 ${
                                      file.is_public ? 'text-white/60 hover:bg-white/10' : 'text-cyan-400 hover:bg-cyan-500/10'
                                    }`}
                                  >
                                    {file.is_public
                                      ? <><Lock className="h-3.5 w-3.5" /> Make Private</>
                                      : <><Globe className="h-3.5 w-3.5" /> Make Public</>
                                    }
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => onRenameItem({ id: file.id, name: file.name, type: 'file' })}
                                  className="cursor-pointer gap-2 hover:bg-white/10"
                                >
                                  <Edit2 className="h-3.5 w-3.5" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem
                                  onClick={() => onDeleteItem({ id: file.id, name: file.name, type: 'file' })}
                                  className="cursor-pointer gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-white transition-colors truncate" title={file.name}>
                      {file.name}
                    </h4>
                    <div className="flex items-center justify-between text-[11px] font-mono text-white/50 mt-1">
                      <span>{formatBytes(file.size_bytes)}</span>
                      <div className="flex items-center gap-1.5">
                        {file.is_public && (
                          <span className="flex items-center gap-1 text-[10px] text-cyan-400 font-bold">
                            <Globe className="h-3 w-3" />
                          </span>
                        )}
                        {file.checksum_sha256 && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                            <ShieldCheck className="h-3 w-3" /> SHA-256
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
