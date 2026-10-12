'use client'

import React from 'react'
import { ChevronRight, HardDrive, Folder } from 'lucide-react'
import { BreadcrumbItem } from '@/types/netshare'

interface FolderBreadcrumbsProps {
  breadcrumbs: BreadcrumbItem[]
  onSelectFolder: (folderId: string | null) => void
}

export function FolderBreadcrumbs({
  breadcrumbs,
  onSelectFolder,
}: FolderBreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-400 overflow-x-auto py-1">
      <button
        onClick={() => onSelectFolder(null)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-slate-900 hover:text-white transition-colors"
      >
        <HardDrive className="h-3.5 w-3.5 text-blue-400" />
        <span className="font-medium text-slate-200">Root Storage</span>
      </button>

      {breadcrumbs.map((item, idx) => {
        const isLast = idx === breadcrumbs.length - 1
        return (
          <React.Fragment key={item.id ?? idx}>
            <ChevronRight className="h-3.5 w-3.5 text-slate-600 shrink-0" />
            <button
              onClick={() => onSelectFolder(item.id)}
              disabled={isLast}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
                isLast
                  ? 'text-white font-semibold cursor-default bg-slate-900/50'
                  : 'hover:bg-slate-900 hover:text-white text-slate-300'
              }`}
            >
              <Folder className="h-3.5 w-3.5 text-amber-400" />
              <span className="truncate max-w-[120px]">{item.name}</span>
            </button>
          </React.Fragment>
        )
      })}
    </nav>
  )
}
