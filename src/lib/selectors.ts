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

export const SELECTORS = {
  taskRow: '[data-testid="task-row"]',
  taskTitle: '[data-testid="task-title"], [role="heading"]',
  taskTag: '[data-testid="task-tag"]',
  menuTrigger: '[data-testid="task-row-menu-button"], [aria-haspopup="menu"]',
  menuContainer: '[role="menu"],[data-testid="task-menu"]',
  archiveAction: '[role="menuitem"][data-testid="task-archive"], [data-testid="archive-task"]'
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

export function extractTaskMetadata(row: HTMLElement): TaskMetadata {
  const { taskId, taskStatus, taskArchived } = row.dataset
  return {
    id: taskId,
    status: taskStatus,
    archived: taskArchived ? taskArchived === "true" : undefined
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
