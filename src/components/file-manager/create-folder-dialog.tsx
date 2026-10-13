'use client'

import React, { useState } from 'react'
import { FolderPlus, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentFolderId: string | null
  onSuccess: () => void
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  currentFolderId,
  onSuccess,
}: CreateFolderDialogProps) {
  const [name, setName] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsPending(true)
    setError('')

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          parentFolderId: currentFolderId,
        }),
      })

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}))
        throw new Error(errorJson?.error?.message || 'Failed to create folder')
      }

      setName('')
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating folder')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#111111] border border-white/10 text-white rounded-2xl shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FolderPlus className="h-4 w-4" />
            </div>
            Create New Folder Node
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="folder-name" className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
              Folder Name
            </Label>
            <input
              id="folder-name"
              placeholder="e.g. Protocol_Logs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full h-11 px-4 text-sm font-medium rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-all"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="linear-button-secondary h-10 rounded-xl text-xs uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="linear-button-primary h-10 rounded-xl text-xs uppercase tracking-wider disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Create Folder'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
