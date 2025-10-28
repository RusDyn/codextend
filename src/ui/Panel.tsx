import { useEffect, useRef } from "react"

import "./Panel.css"
import { MatchStatus, usePanelStore } from "./panelStore"

interface StatusBadgeConfig {
  label: string
  className: string
}

const STATUS_BADGES: Record<MatchStatus, StatusBadgeConfig> = {
  pending: { label: "Pending", className: "bg-slate-800/80 text-slate-200" },
  processing: { label: "Processing", className: "bg-indigo-500/20 text-indigo-200" },
  archived: { label: "Archived", className: "bg-emerald-500/20 text-emerald-200" },
  failed: { label: "Failed", className: "bg-rose-500/20 text-rose-200" }
}

function formatMatchTitle(title: string, fallback: string): string {
  const trimmed = title.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

const TOAST_TIMEOUT_MS = 4000

export default function Panel(): JSX.Element {
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
  const toastTimers = useRef(new Map<string, number>())
  const previousScanning = useRef(scanning)
  const previousArchiving = useRef(archiving)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const timers = toastTimers.current
    const activeIds = new Set(toasts.map((toast) => toast.id))

    for (const [id, handle] of timers.entries()) {
      if (!activeIds.has(id)) {
        window.clearTimeout(handle)
        timers.delete(id)
      }
    }

    toasts.forEach((toast) => {
      if (timers.has(toast.id)) {
        return
      }

      const handle = window.setTimeout(() => {
        dismissToast(toast.id)
        toastTimers.current.delete(toast.id)
      }, TOAST_TIMEOUT_MS)
      timers.set(toast.id, handle)
    })

    return () => {
      for (const handle of timers.values()) {
        window.clearTimeout(handle)
      }
      timers.clear()
    }
  }, [toasts, dismissToast])

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

  useEffect(() => {
    if (!confirmVisible || typeof window === "undefined") {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        cancelArchive()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [confirmVisible, cancelArchive])

  useEffect(() => {
    const timers = toastTimers.current

    return () => {
      if (typeof window === "undefined") {
        return
      }

      for (const timeoutId of timers.values()) {
        window.clearTimeout(timeoutId)
      }
      timers.clear()
    }
  }, [])

  const isScanDisabled = !ready || scanning || archiving
  const isArchiveDisabled = !ready || scanning || archiving || matches.length === 0

  const listEmpty = matches.length === 0
  return (
    <div className="relative flex h-full min-h-[26rem] w-full flex-col gap-4 bg-slate-950 p-5 text-slate-100">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-slate-50">Nerch task panel</h1>
        <p className="text-sm text-slate-400">
          Identify and archive nerch-related tasks without leaving the queue.
        </p>
      </header>

      <p
        aria-live="polite"
        className="rounded-md border border-slate-800 bg-slate-900/80 p-3 text-sm text-slate-200"
      >
        {statusMessage}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          ref={scanButtonRef}
          className="inline-flex items-center justify-center rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-indigo-500/40"
          disabled={isScanDisabled}
          onClick={() => {
            void scanMatches()
          }}
          type="button"
        >
          {scanning ? "Scanning…" : "Scan & Preview"}
        </button>

        <button
          ref={archiveButtonRef}
          className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-500/40"
          disabled={isArchiveDisabled}
          onClick={() => {
            requestArchive()
          }}
          type="button"
        >
          {archiving ? "Archiving…" : "Archive ‘nerch’ tasks"}
        </button>
      </div>

      <section aria-label="Matched tasks preview" className="flex min-h-0 flex-1 flex-col">
        <h2 className="text-sm font-semibold text-slate-300">Matches</h2>
        <div className="mt-2 flex-1 overflow-hidden rounded-md border border-slate-800 bg-slate-900/60">
          <ol className="h-full space-y-1 overflow-y-auto p-2">
            {listEmpty ? (
              <li className="flex h-full items-center justify-center rounded-md bg-slate-900/40 p-6 text-sm text-slate-500">
                {scanning ? "Scanning for nerch tasks…" : "Run a scan to preview matching tasks."}
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
                    className="flex flex-col gap-1 rounded-md border border-slate-800/60 bg-slate-950/40 p-3 text-sm text-slate-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-slate-100">{title}</p>
                        {match.candidate.tags.length > 0 ? (
                          <p className="text-xs text-slate-400">
                            {match.candidate.tags.map((tag) => tag.trim()).join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    {typeof match.attempts === "number" ? (
                      <p className="text-xs text-slate-400">Attempts: {match.attempts}</p>
                    ) : null}
                    {match.error ? (
                      <p className="text-xs text-rose-200">{match.error}</p>
                    ) : null}
                  </li>
                )
              })
            )}
          </ol>
        </div>
      </section>

      {confirmVisible ? (
        <div
          aria-modal="true"
          className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 px-4"
          role="dialog"
          tabIndex={-1}
        >
          <div className="w-full max-w-sm space-y-4 rounded-lg border border-slate-700 bg-slate-900 p-5 shadow-xl">
            <header className="space-y-1">
              <h2 className="text-base font-semibold text-slate-100">Archive matched tasks?</h2>
              <p className="text-sm text-slate-300">
                This will click the archive button for each matched task in the current view.
              </p>
            </header>
            <div className="flex justify-end gap-2">
              <button
                className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                onClick={() => cancelArchive()}
                type="button"
              >
                Cancel
              </button>
              <button
                ref={confirmButtonRef}
                className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                onClick={() => {
                  void confirmArchive()
                }}
                type="button"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-end gap-2 p-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-xs items-start gap-3 rounded-md border border-slate-700 bg-slate-900/95 p-3 text-sm shadow-lg"
          >
            <span
              className={`mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${
                toast.tone === "success"
                  ? "bg-emerald-400"
                  : toast.tone === "error"
                  ? "bg-rose-400"
                  : "bg-slate-300"
              }`}
            />
            <p className="flex-1 text-slate-100">{toast.message}</p>
            <button
              aria-label="Dismiss notification"
              className="text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              onClick={() => dismissToast(toast.id)}
              type="button"
            >
              Close
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
