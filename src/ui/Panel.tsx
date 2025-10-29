import { useEffect, useRef } from "react"

import "./Panel.css"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../components/ui/dialog"
import { ScrollArea } from "../components/ui/scroll-area"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport
} from "../components/ui/toast"
import { cn } from "../lib/utils"
import { MatchStatus, usePanelStore } from "./panelStore"

interface StatusBadgeConfig {
  label: string
  className: string
}

const STATUS_BADGES: Record<MatchStatus, StatusBadgeConfig> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
  processing: { label: "Processing", className: "bg-primary/20 text-primary" },
  archived: { label: "Archived", className: "bg-emerald-500/20 text-emerald-300" },
  failed: { label: "Failed", className: "bg-destructive/15 text-destructive-foreground" }
}

const TOAST_DURATION_MS = 4000

const TOAST_TONE_STYLES = {
  info: "border-l-4 border-l-sky-500/70",
  success: "border-l-4 border-l-emerald-500/80",
  error: "border-l-4 border-l-rose-500/80"
} as const

const TOAST_TONE_TITLES = {
  info: "Notice",
  success: "Success",
  error: "Error"
} as const

function formatMatchTitle(title: string, fallback: string): string {
  const trimmed = title.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

export function Panel(): JSX.Element {
  const ready = usePanelStore((state) => state.ready)
  const initialize = usePanelStore((state) => state.initialize)
  const scanning = usePanelStore((state) => state.scanning)
  const archiving = usePanelStore((state) => state.archiving)
  const statusMessage = usePanelStore((state) => state.statusMessage)
  const matches = usePanelStore((state) => state.matches)
  const confirmVisible = usePanelStore((state) => state.confirmVisible)
  const toasts = usePanelStore((state) => state.toasts)
  const scanMatches = usePanelStore((state) => state.scanMatches)
  const requestArchive = usePanelStore((state) => state.requestArchive)
  const cancelArchive = usePanelStore((state) => state.cancelArchive)
  const confirmArchive = usePanelStore((state) => state.confirmArchive)
  const dismissToast = usePanelStore((state) => state.dismissToast)

  const scanButtonRef = useRef<HTMLButtonElement>(null)
  const archiveButtonRef = useRef<HTMLButtonElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const previousScanning = useRef(scanning)
  const previousArchiving = useRef(archiving)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (previousScanning.current && !scanning) {
      if (matches.length > 0) {
        archiveButtonRef.current?.focus()
      } else {
        scanButtonRef.current?.focus()
      }
    }
    previousScanning.current = scanning
  }, [scanning, matches.length])

  useEffect(() => {
    if (previousArchiving.current && !archiving) {
      scanButtonRef.current?.focus()
    }
    previousArchiving.current = archiving
  }, [archiving])

  useEffect(() => {
    if (!confirmVisible) {
      return
    }

    const button = confirmButtonRef.current
    if (button) {
      button.focus()
    }
  }, [confirmVisible])

  const isScanDisabled = !ready || scanning || archiving
  const isArchiveDisabled = !ready || scanning || archiving || matches.length === 0

  const listEmpty = matches.length === 0

  return (
    <ToastProvider duration={TOAST_DURATION_MS}>
      <div className="relative flex h-full min-h-[26rem] w-full flex-col gap-4 bg-background p-5 text-foreground">
        <header className="space-y-1">
          <h1 className="text-lg font-semibold">Nerch task panel</h1>
          <p className="text-sm text-muted-foreground">
            Identify and archive nerch-related tasks without leaving the queue.
          </p>
        </header>

        <Card className="border-border/60 bg-muted/20">
          <CardContent className="p-4 text-sm text-muted-foreground">
            <p>{statusMessage}</p>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button
            ref={scanButtonRef}
            disabled={isScanDisabled}
            onClick={() => {
              void scanMatches()
            }}
          >
            {scanning ? "Scanning…" : "Scan & Preview"}
          </Button>

          <Button
            ref={archiveButtonRef}
            disabled={isArchiveDisabled}
            onClick={() => {
              requestArchive()
            }}
            variant="secondary"
          >
            {archiving ? "Archiving…" : "Archive ‘nerch’ tasks"}
          </Button>
        </div>

        <Card className="flex min-h-0 flex-1 flex-col border-border/60 bg-background/40">
          <CardHeader className="space-y-1 border-b border-border/60 px-4 py-3">
            <CardTitle className="text-sm font-semibold">Matches</CardTitle>
            <CardDescription>Preview the tasks flagged for archiving.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full">
              <ol className="space-y-3 p-4">
                {listEmpty ? (
                  <li className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/10 text-sm text-muted-foreground">
                    {scanning
                      ? "Scanning for nerch tasks…"
                      : "Run a scan to preview matching tasks."}
                  </li>
                ) : (
                  matches.map((match) => {
                    const badge = STATUS_BADGES[match.status]
                    const title = formatMatchTitle(
                      match.candidate.title ?? "",
                      match.candidate.metadata.id ?? "Untitled task"
                    )

                    return (
                      <li
                        key={match.id}
                        className="rounded-lg border border-border/60 bg-muted/10 p-4 text-sm shadow-sm"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{title}</p>
                            {match.candidate.tags.length > 0 ? (
                              <p className="text-xs text-muted-foreground">
                                {match.candidate.tags.map((tag) => tag.trim()).join(", ")}
                              </p>
                            ) : null}
                          </div>
                          <Badge className={cn("shrink-0", badge.className)}>{badge.label}</Badge>
                        </div>
                        {typeof match.attempts === "number" ? (
                          <p className="mt-2 text-xs text-muted-foreground">Attempts: {match.attempts}</p>
                        ) : null}
                        {match.error ? (
                          <p className="mt-1 text-xs text-destructive">{match.error}</p>
                        ) : null}
                      </li>
                    )
                  })
                )}
              </ol>
            </ScrollArea>
          </CardContent>
        </Card>

        <Dialog
          open={confirmVisible}
          onOpenChange={(open) => {
            if (!open) {
              cancelArchive()
            }
          }}
        >
          <DialogContent className="border-border/60 bg-background/95 text-foreground">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle>Archive matched tasks?</DialogTitle>
              <DialogDescription>
                This will click the archive button for each matched task in the current view.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button onClick={() => cancelArchive()} variant="outline">
                Cancel
              </Button>
              <Button
                ref={confirmButtonRef}
                onClick={() => {
                  void confirmArchive()
                }}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          className={cn(
            "pointer-events-auto border border-border/60 bg-background/95 text-sm text-foreground shadow-lg backdrop-blur",
            TOAST_TONE_STYLES[toast.tone]
          )}
          defaultOpen
          duration={TOAST_DURATION_MS}
          onOpenChange={(open) => {
            if (!open) {
              dismissToast(toast.id)
            }
          }}
        >
          <div className="grid gap-1">
            <ToastTitle>{TOAST_TONE_TITLES[toast.tone]}</ToastTitle>
            <ToastDescription className="text-muted-foreground">
              {toast.message}
            </ToastDescription>
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-end gap-2 p-4 sm:left-auto sm:right-0" />
    </ToastProvider>
  )
}

export default Panel
