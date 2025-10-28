import { ACTION_DELAY_MS, RETRIES, SCAN_MAX } from "../config"
import { isNerch } from "./match"
import {
  clickArchiveInMenu,
  createTaskNode,
  getTaskRows,
  openRowMenu,
  type TaskMetadata,
  type TaskNode
} from "./selectors"
import { smoothScrollIntoView, waitForPredicate } from "./dom"

export interface ArchiveCandidate {
  node: TaskNode
  title: string
  tags: string[]
  metadata: TaskMetadata
}

export interface ArchiveFailure {
  task: ArchiveCandidate
  attempts: number
  error: Error
}

export interface ArchiveSummary {
  total: number
  archived: number
  failed: ArchiveFailure[]
}

export interface ArchiveProgress {
  status: "pending" | "attempt" | "archived" | "failed" | "complete"
  message: string
  total: number
  processed: number
  archived: number
  failed: number
  failures: ArchiveFailure[]
  current?: {
    task: ArchiveCandidate
    attempt: number
    success?: boolean
  }
  summary?: ArchiveSummary
}

export type ArchiveProgressCallback = (progress: ArchiveProgress) => void

const ARCHIVE_CONFIRM_TIMEOUT_MS = 4000
const ARCHIVE_CONFIRM_INTERVAL_MS = 100

function isVisible(element: HTMLElement): boolean {
  if (element.hidden || element.getAttribute("aria-hidden") === "true") {
    return false
  }

  const globalWindow = element.ownerDocument?.defaultView ?? window
  if (globalWindow && typeof globalWindow.getComputedStyle === "function") {
    const styles = globalWindow.getComputedStyle(element)
    if (styles.display === "none" || styles.visibility === "hidden" || styles.opacity === "0") {
      return false
    }
  }

  return true
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? ""
}

function isRowArchived(row: HTMLElement): boolean {
  if (!row.isConnected) {
    return true
  }

  const archivedFlag = row.dataset.taskArchived ?? row.getAttribute("data-task-archived")
  return archivedFlag === "true"
}

async function confirmArchived(row: HTMLElement): Promise<boolean> {
  try {
    await waitForPredicate(
      () => {
        return isRowArchived(row)
      },
      {
        timeout: ARCHIVE_CONFIRM_TIMEOUT_MS,
        interval: ARCHIVE_CONFIRM_INTERVAL_MS
      }
    )
    return true
  } catch (error) {
    console.warn("Archive confirmation failed", error)
    return false
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function scan(root: ParentNode = document): ArchiveCandidate[] {
  const rows = getTaskRows(root)
    .filter(isVisible)
    .slice(0, SCAN_MAX)

  return rows
    .map((row) => createTaskNode(row))
    .map((node) => {
      const title = normalizeText(node.title?.textContent)
      const tags = node.tags.map((tag) => normalizeText(tag.textContent)).filter((text) => text.length > 0)

      return {
        node,
        title,
        tags,
        metadata: node.metadata
      }
    })
    .filter((candidate) => isNerch(candidate.title, candidate.tags))
}

interface AttemptResult {
  success: boolean
  attempts: number
  error?: Error
}

async function attemptArchive(task: ArchiveCandidate): Promise<AttemptResult> {
  let attempts = 0
  let lastError: Error | undefined

  while (attempts < RETRIES) {
    attempts += 1

    try {
      smoothScrollIntoView(task.node.row)
      const menu = await openRowMenu(task.node.row)

      const clicked = await clickArchiveInMenu(menu ?? document)
      if (!clicked) {
        lastError = new Error("Failed to trigger archive action")
      } else {
        const confirmed = await confirmArchived(task.node.row)
        if (confirmed) {
          return { success: true, attempts }
        }

        lastError = new Error("Archive action did not complete in time")
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }

    if (attempts < RETRIES) {
      await delay(ACTION_DELAY_MS)
    }
  }

  return { success: false, attempts, error: lastError ?? new Error("Archive failed") }
}

function emitProgress(
  callback: ArchiveProgressCallback | undefined,
  progress: ArchiveProgress
): void {
  if (!callback) {
    return
  }

  callback(progress)
}

export async function archive(
  tasks: ArchiveCandidate[],
  onProgress?: ArchiveProgressCallback
): Promise<ArchiveSummary> {
  const total = tasks.length
  const failures: ArchiveFailure[] = []
  let processed = 0
  let archivedCount = 0

  emitProgress(onProgress, {
    status: "pending",
    message: `Preparing to archive ${total} task${total === 1 ? "" : "s"}`,
    total,
    processed,
    archived: archivedCount,
    failed: failures.length,
    failures: [...failures]
  })

  for (const task of tasks) {
    const statusMessage = `Archiving “${task.title || task.metadata.id || "unknown"}” (${processed + 1}/${total})`
    emitProgress(onProgress, {
      status: "attempt",
      message: statusMessage,
      total,
      processed,
      archived: archivedCount,
      failed: failures.length,
      failures: [...failures],
      current: { task, attempt: processed + 1 }
    })

    const result = await attemptArchive(task)

    processed += 1

    if (result.success) {
      archivedCount += 1
      emitProgress(onProgress, {
        status: "archived",
        message: `Archived “${task.title || task.metadata.id || "unknown"}” (${processed}/${total})`,
        total,
        processed,
        archived: archivedCount,
        failed: failures.length,
        failures: [...failures],
        current: { task, attempt: result.attempts, success: true }
      })
    } else {
      const failure: ArchiveFailure = {
        task,
        attempts: result.attempts,
        error: result.error ?? new Error("Archive failed")
      }
      failures.push(failure)

      emitProgress(onProgress, {
        status: "failed",
        message: `Failed to archive “${task.title || task.metadata.id || "unknown"}”`,
        total,
        processed,
        archived: archivedCount,
        failed: failures.length,
        failures: [...failures],
        current: { task, attempt: result.attempts, success: false }
      })
    }

    if (processed < total) {
      await delay(ACTION_DELAY_MS)
    }
  }

  const summary: ArchiveSummary = {
    total,
    archived: archivedCount,
    failed: [...failures]
  }

  emitProgress(onProgress, {
    status: "complete",
    message: `Archived ${archivedCount} of ${total} task${total === 1 ? "" : "s"}`,
    total,
    processed,
    archived: archivedCount,
    failed: failures.length,
    failures: [...failures],
    summary
  })

  return summary
}
