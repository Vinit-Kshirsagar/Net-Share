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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Edit2 className="h-4 w-4 text-blue-400" />
            Rename {item?.type === 'file' ? 'File' : 'Folder'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRename} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rename-input" className="text-xs text-slate-300">
              New Name
            </Label>
            <Input
              id="rename-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
              className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-blue-500"
              autoFocus
            />
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
              type="submit"
              disabled={isPending || !name.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
