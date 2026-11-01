'use client'

import * as React from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  isPending?: boolean
  destructive?: boolean
  className?: string
}

/**
 * Reusable confirmation dialog built on the shadcn AlertDialog primitive.
 *
 * The confirm action is a plain Button rather than AlertDialogAction so the
 * dialog stays open while an async delete runs; callers close it from their
 * success handler. Cancel still closes immediately.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  isPending = false,
  destructive = true,
  className,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn('bg-hydra-surface border-hydra-border', className)}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground flex items-center gap-2">
            {destructive && <AlertTriangle className="size-5 text-hydra-red shrink-0" />}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-hydra-muted">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isPending}
            className="border-hydra-border text-hydra-muted hover:text-white"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              'text-white',
              destructive
                ? 'bg-hydra-red hover:bg-hydra-red/80'
                : 'bg-hydra-purple hover:bg-hydra-purple/80',
            )}
          >
            {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
