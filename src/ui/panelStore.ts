import { create } from "zustand"
import { archive, scan, type ArchiveCandidate, type ArchiveFailure, type ArchiveProgress } from "../lib/archive"

export type MatchStatus = "pending" | "processing" | "archived" | "failed"

type ToastTone = "info" | "success" | "error"

export interface PanelToast {
  id: string
  tone: ToastTone
  message: string
}

export interface MatchPreview {
  id: string
  candidate: ArchiveCandidate
  status: MatchStatus
  attempts?: number
  error?: string
}

interface PanelStore {
  ready: boolean
  statusMessage: string
  matches: MatchPreview[]
  scanning: boolean
  archiving: boolean
  confirmVisible: boolean
  toasts: PanelToast[]
  initialize: () => void
  scanMatches: () => Promise<void>
  requestArchive: () => void
  cancelArchive: () => void
  confirmArchive: () => Promise<void>
  addToast: (tone: ToastTone, message: string) => string
  dismissToast: (id: string) => void
}

function createMatchId(candidate: ArchiveCandidate, index: number): string {
  const parts = [candidate.metadata.id, candidate.title, candidate.tags.join(" ")]
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .join("::")

  const base = parts.length > 0 ? parts : `match-${index}`
  return `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function summarizeFailure(task: ArchiveCandidate, failure?: ArchiveFailure): string {
  if (failure?.error) {
    return failure.error.message
  }

  const identifier = task.title || task.metadata.id || "Unknown task"
  return `Archive failed for “${identifier}”`
}

export const usePanelStore = create<PanelStore>((set, get) => ({
  ready: false,
  statusMessage: "Initializing panel…",
  matches: [],
  scanning: false,
  archiving: false,
  confirmVisible: false,
  toasts: [],
  initialize() {
    if (!get().ready) {
      set({ ready: true, statusMessage: "Ready to scan for nerch tasks." })
    }
  },
  addToast(tone, message) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    set((state) => ({ toasts: [...state.toasts, { id, tone, message }] }))
    return id
  },
  dismissToast(id) {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
  },
  async scanMatches() {
    const { scanning, archiving } = get()
    if (scanning || archiving) {
      return
    }

    set({
      scanning: true,
      statusMessage: "Scanning for nerch tasks…",
      matches: [],
      confirmVisible: false
    })

    try {
      const candidates = scan()
      const matches = candidates.map<MatchPreview>((candidate, index) => ({
        id: createMatchId(candidate, index),
        candidate,
        status: "pending"
      }))

      set({
        scanning: false,
        matches,
        statusMessage:
          matches.length > 0
            ? `Found ${matches.length} nerch task${matches.length === 1 ? "" : "s"}.`
            : "No nerch tasks detected."
      })

      if (matches.length === 0) {
        get().addToast("info", "No nerch tasks were detected in the current view.")
      } else {
        get().addToast(
          "success",
          `Ready to archive ${matches.length} task${matches.length === 1 ? "" : "s"}.`
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      set({
        scanning: false,
        matches: [],
        statusMessage: `Scan failed: ${message}`
      })
      get().addToast("error", `Scan failed: ${message}`)
    }
  },
  requestArchive() {
    const { scanning, archiving, matches } = get()
    if (scanning || archiving) {
      return
    }

    if (matches.length === 0) {
      get().addToast("info", "Scan first to preview nerch tasks before archiving.")
      return
    }

    set({ confirmVisible: true })
  },
  cancelArchive() {
    if (get().archiving) {
      return
    }

    set({ confirmVisible: false })
  },
  async confirmArchive() {
    const { scanning, archiving, matches } = get()
    if (scanning || archiving) {
      return
    }

    if (matches.length === 0) {
      set({ confirmVisible: false })
      return
    }

    set({
      archiving: true,
      confirmVisible: false,
      statusMessage: "Archiving nerch tasks…"
    })

    try {
      const summary = await archive(
        matches.map((entry) => entry.candidate),
        (progress: ArchiveProgress) => {
          set((state) => {
            const updated = state.matches.map((entry) => {
              if (progress.status === "pending") {
                return { ...entry, status: "pending", attempts: undefined, error: undefined }
              }

              const isCurrent = progress.current?.task && entry.candidate === progress.current.task
              if (!isCurrent) {
                return entry
              }

              if (progress.status === "attempt") {
                return {
                  ...entry,
                  status: "processing",
                  attempts: progress.current?.attempt,
                  error: undefined
                }
              }

              if (progress.status === "archived") {
                return {
                  ...entry,
                  status: "archived",
                  attempts: progress.current?.attempt,
                  error: undefined
                }
              }

              if (progress.status === "failed") {
                const failure = progress.failures.find(
                  (item) => item.task === progress.current?.task
                )
                return {
                  ...entry,
                  status: "failed",
                  attempts: progress.current?.attempt,
                  error: summarizeFailure(entry.candidate, failure)
                }
              }

              return entry
            })

            return {
              matches: updated,
              statusMessage: progress.message
            }
          })
        }
      )

      set({
        archiving: false,
        statusMessage: `Archived ${summary.archived} of ${summary.total} nerch task${
          summary.total === 1 ? "" : "s"
        }.`
      })

      if (summary.total === 0) {
        get().addToast("info", "There were no nerch tasks to archive.")
      } else if (summary.failed.length === 0) {
        get().addToast(
          "success",
          `Archived ${summary.archived} nerch task${summary.archived === 1 ? "" : "s"}.`
        )
      } else {
        get().addToast(
          "error",
          `Archived ${summary.archived} of ${summary.total} tasks. ${summary.failed.length} failed.`
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      set({ archiving: false, statusMessage: `Archive failed: ${message}` })
      get().addToast("error", `Archive failed: ${message}`)
    }
  }
}))
