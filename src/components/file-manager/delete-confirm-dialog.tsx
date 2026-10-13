'use client'

import React, { useState } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: { id: string; name: string; type: 'file' | 'folder' } | null
  onSuccess: () => void
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: DeleteConfirmDialogProps) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (!item) return

    setIsPending(true)
    setError('')

    try {
      const endpoint = item.type === 'file' ? `/api/files/${item.id}` : `/api/folders/${item.id}`
      const res = await fetch(endpoint, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}))
        throw new Error(errorJson?.error?.message || `Failed to delete ${item.type}`)
      }

      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error deleting item')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#111111] border border-white/10 text-white rounded-2xl shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-400">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Trash2 className="h-4 w-4" />
            </div>
            Delete {item?.type === 'file' ? 'File Object' : 'Folder Node'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div className="py-2 text-sm text-white/70 space-y-2">
          <p>
            Are you sure you want to permanently delete{' '}
            <strong className="text-white font-mono break-all">{item?.name}</strong>?
          </p>
          {item?.type === 'file' ? (
            <p className="text-xs text-white/40">
              This will remove the object from storage namespace and delete its database metadata.
            </p>
          ) : (
            <p className="text-xs text-amber-400/90 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Deleting this folder will remove any subfolders and unassign contained files.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-3 pt-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="linear-button-secondary h-10 rounded-xl text-xs uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
          >
            {isPending ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
