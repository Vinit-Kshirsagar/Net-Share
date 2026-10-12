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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FolderPlus className="h-5 w-5 text-blue-400" />
            Create New Folder
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="folder-name" className="text-xs text-slate-300">
              Folder Name
            </Label>
            <Input
              id="folder-name"
              placeholder="e.g. Network_Reports"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
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
              {isPending ? 'Creating...' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
