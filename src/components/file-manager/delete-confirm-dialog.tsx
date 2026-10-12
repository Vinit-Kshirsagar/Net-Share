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
import { Button } from '@/components/ui/button'

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
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-red-400">
            <Trash2 className="h-5 w-5" />
            Delete {item?.type === 'file' ? 'File' : 'Folder'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="py-2 text-sm text-slate-300">
          <p>
            Are you sure you want to permanently delete{' '}
            <strong className="text-white font-mono break-all">{item?.name}</strong>?
          </p>
          {item?.type === 'file' ? (
            <p className="text-xs text-slate-500 mt-2">
              This will remove the object from Supabase Storage and delete its relational metadata.
            </p>
          ) : (
            <p className="text-xs text-amber-400/90 mt-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Deleting this folder will remove any subfolders and unassign files within it.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-800 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-500 text-white"
          >
            {isPending ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
