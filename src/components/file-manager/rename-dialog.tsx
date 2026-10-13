'use client'

import React, { useState, useEffect } from 'react'
import { Edit2, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface RenameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: { id: string; name: string; type: 'file' | 'folder' } | null
  onSuccess: () => void
}

export function RenameDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: RenameDialogProps) {
  const [name, setName] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (item) {
      setName(item.name)
      setError('')
    }
  }, [item])

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item || !name.trim() || name.trim() === item.name) {
      onOpenChange(false)
      return
    }

    setIsPending(true)
    setError('')

    try {
      const endpoint = item.type === 'file' ? `/api/files/${item.id}` : `/api/folders/${item.id}`
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}))
        throw new Error(errorJson?.error?.message || `Failed to rename ${item.type}`)
      }

      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error renaming item')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#111111] border border-white/10 text-white rounded-2xl shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-white">
              <Edit2 className="h-4 w-4" />
            </div>
            Rename {item?.type === 'file' ? 'File Object' : 'Folder Node'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRename} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="rename-input" className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
              New Name
            </Label>
            <input
              id="rename-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
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
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
