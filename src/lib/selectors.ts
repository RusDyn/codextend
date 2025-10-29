import { clickElement, waitFor, type WaitForElementOptions } from "./dom"

export interface TaskMetadata {
  id?: string
  status?: string
  archived?: boolean
}

export interface TaskNode {
  row: HTMLElement
  title: HTMLElement | null
  tags: HTMLElement[]
  menuTrigger: HTMLElement | null
  metadata: TaskMetadata
}

const TASK_ROW_SELECTORS = [
  '[data-testid="task-row"]',
  'article[data-task-id]',
  'div[data-task-id]',
  'li[data-task-id]',
  'tr[data-task-id]'
]

const MENU_TRIGGER_SELECTORS = [
  '[data-testid="task-row-menu-button"]',
  '[data-testid="codex-task-menu-button"]',
  '[data-testid="overflow-menu-trigger"]',
  '[aria-haspopup="menu"]',
  'button[aria-label*="More" i]',
  'button[aria-label*="Action" i]'
]

const MENU_CONTAINER_SELECTORS = [
  '[role="menu"]',
  '[data-testid="task-menu"]',
  '[data-qa="codex-task-menu"]'
]

const ARCHIVE_ACTION_SELECTORS = [
  '[role="menuitem"][data-testid="task-archive"]',
  '[data-testid="archive-task"]',
  '[role="menuitem"][data-qa="archive-task"]',
  '[role="menuitem"][data-action="archive"]'
]

export const SELECTORS = {
  taskRow: TASK_ROW_SELECTORS.join(", "),
  taskTitle: '[data-testid="task-title"], [data-task-title], [role="heading"]',
  taskTag: '[data-testid="task-tag"], [data-task-tag], [data-testid="tag"]',
  menuTrigger: MENU_TRIGGER_SELECTORS.join(", "),
  menuContainer: MENU_CONTAINER_SELECTORS.join(","),
  archiveAction: ARCHIVE_ACTION_SELECTORS.join(", ")
} as const

export function getTaskRows(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(SELECTORS.taskRow))
}

export function getTaskTitle(row: HTMLElement): HTMLElement | null {
  const title = row.querySelector<HTMLElement>(SELECTORS.taskTitle)
  if (!title) {
    console.warn("Unable to locate task title for row", row)
  }
  return title
}

export function getTaskTags(row: HTMLElement): HTMLElement[] {
  return Array.from(row.querySelectorAll<HTMLElement>(SELECTORS.taskTag))
}

function readDataAttribute(row: HTMLElement, keys: string[], attributes: string[]): string | undefined {
  for (const key of keys) {
    const value = row.dataset[key as keyof DOMStringMap]
    if (typeof value === "string" && value.length > 0) {
      return value
    }
  }

  for (const attribute of attributes) {
    const value = row.getAttribute(attribute)
    if (typeof value === "string" && value.length > 0) {
      return value
    }
  }

  return undefined
}

export function extractTaskMetadata(row: HTMLElement): TaskMetadata {
  const id = readDataAttribute(row, ["taskId", "id"], ["data-task-id", "data-id"])
  const status = readDataAttribute(row, ["taskStatus", "status"], ["data-task-status", "data-status"])
  const archivedRaw = readDataAttribute(
    row,
    ["taskArchived", "archived"],
    ["data-task-archived", "data-archived"]
  )

  return {
    id,
    status,
    archived: typeof archivedRaw === "string" ? archivedRaw === "true" : undefined
  }
}

export interface OpenRowMenuOptions extends Partial<WaitForElementOptions> {
  waitForMenu?: boolean
  menuSelector?: string
}

export async function openRowMenu(row: HTMLElement, options: OpenRowMenuOptions = {}): Promise<HTMLElement | null> {
  const trigger = row.querySelector<HTMLElement>(SELECTORS.menuTrigger)
  if (!trigger) {
    console.warn("Task row menu trigger not found", row)
    return null
  }

  clickElement(trigger)

  const { waitForMenu = true, menuSelector, ...waitOptions } = options
  if (!waitForMenu) {
    return null
  }

  const selector = menuSelector ?? SELECTORS.menuContainer

  try {
    const menu = await waitFor<HTMLElement>(selector, waitOptions)
    return menu
  } catch (error) {
    console.warn("Failed to locate task menu after opening", error)
    return null
  }
}

export async function clickArchiveInMenu(
  root: ParentNode = document,
  options: Partial<WaitForElementOptions> = {}
): Promise<boolean> {
  try {
    const { root: optionRoot, ...waitOptions } = options
    const searchRoot = optionRoot ?? root ?? document

    const archiveAction = await waitFor<HTMLElement>(SELECTORS.archiveAction, {
      root: searchRoot,
      ...waitOptions
    })
    clickElement(archiveAction)
    return true
  } catch (error) {
    console.warn("Unable to click archive action", error)
    return false
  }
}

export function createTaskNode(row: HTMLElement): TaskNode {
  return {
    row,
    title: getTaskTitle(row),
    tags: getTaskTags(row),
    menuTrigger: row.querySelector<HTMLElement>(SELECTORS.menuTrigger),
    metadata: extractTaskMetadata(row)
  }
}
