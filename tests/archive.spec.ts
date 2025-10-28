import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { ACTION_DELAY_MS, RETRIES } from "../src/config"
import { archive, scan, type ArchiveProgress } from "../src/lib/archive"
import * as selectors from "../src/lib/selectors"
import * as dom from "../src/lib/dom"

function createTask({
  id,
  title,
  tags = [],
  status = "active"
}: {
  id: string
  title: string
  tags?: string[]
  status?: string
}): HTMLElement {
  const row = document.createElement("article")
  row.dataset.testid = "task-row"
  row.setAttribute("data-testid", "task-row")
  row.dataset.taskId = id
  row.dataset.taskStatus = status
  const heading = document.createElement("h3")
  heading.setAttribute("data-testid", "task-title")
  heading.textContent = title
  row.appendChild(heading)

  for (const tag of tags) {
    const tagElement = document.createElement("span")
    tagElement.setAttribute("data-testid", "task-tag")
    tagElement.textContent = tag
    row.appendChild(tagElement)
  }

  const menuButton = document.createElement("button")
  menuButton.setAttribute("data-testid", "task-row-menu-button")
  menuButton.type = "button"
  row.appendChild(menuButton)

  return row
}

describe("scan", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
  })

  it("returns Nerch-related tasks with metadata", () => {
    const container = document.createElement("div")
    container.appendChild(
      createTask({ id: "1", title: "Nerch Meetup", tags: ["Community", "Event"] })
    )
    container.appendChild(createTask({ id: "2", title: "General Discussion" }))
    document.body.appendChild(container)

    const result = scan()

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe("Nerch Meetup")
    expect(result[0].tags).toEqual(["Community", "Event"])
    expect(result[0].metadata).toMatchObject({ id: "1", status: "active" })
  })
})

describe("archive", () => {
  const originalScrollIntoView = Element.prototype.scrollIntoView

  beforeEach(() => {
    document.body.innerHTML = ""
    vi.restoreAllMocks()
    Element.prototype.scrollIntoView = vi.fn() as typeof Element.prototype.scrollIntoView
  })

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("archives tasks successfully", async () => {
    const row = createTask({ id: "1", title: "Nerch Gathering", tags: ["Community"] })
    document.body.appendChild(row)

    const menu = document.createElement("div")
    menu.setAttribute("role", "menu")
    const archiveAction = document.createElement("button")
    archiveAction.setAttribute("data-testid", "task-archive")
    menu.appendChild(archiveAction)
    document.body.appendChild(menu)

    const openMenuSpy = vi.spyOn(selectors, "openRowMenu").mockResolvedValue(menu)
    const clickArchiveSpy = vi.spyOn(selectors, "clickArchiveInMenu").mockImplementation(async () => {
      row.remove()
      return true
    })

    const events: ArchiveProgress[] = []
    const summary = await archive(scan(), (progress) => events.push(progress))

    expect(openMenuSpy).toHaveBeenCalled()
    expect(clickArchiveSpy).toHaveBeenCalled()
    expect(summary).toEqual({ total: 1, archived: 1, failed: [] })
    expect(events.at(-1)?.summary).toEqual(summary)
    expect(events.at(-1)?.status).toBe("complete")
  })

  it("fails after retries when confirmation times out", async () => {
    const row = createTask({ id: "1", title: "Nerch Planning", tags: ["Community"] })
    document.body.appendChild(row)

    const menu = document.createElement("div")
    menu.setAttribute("role", "menu")
    document.body.appendChild(menu)

    vi.useFakeTimers()

    vi.spyOn(selectors, "openRowMenu").mockResolvedValue(menu)
    const clickSpy = vi
      .spyOn(selectors, "clickArchiveInMenu")
      .mockResolvedValue(true)

    vi.spyOn(dom, "waitForPredicate").mockRejectedValue(new Error("Timed out"))

    const events: ArchiveProgress[] = []
    const summaryPromise = archive(scan(), (progress) => events.push(progress))

    await vi.advanceTimersByTimeAsync(ACTION_DELAY_MS * (RETRIES - 1))

    const summary = await summaryPromise

    expect(clickSpy).toHaveBeenCalledTimes(RETRIES)
    expect(summary.total).toBe(1)
    expect(summary.archived).toBe(0)
    expect(summary.failed).toHaveLength(1)
    expect(events.at(-1)?.status).toBe("complete")
    expect(events.at(-1)?.summary).toEqual(summary)
  })

  it("retries archiving until success", async () => {
    const row = createTask({ id: "1", title: "Nerch Follow-up", tags: ["Community"] })
    document.body.appendChild(row)

    const menu = document.createElement("div")
    menu.setAttribute("role", "menu")
    document.body.appendChild(menu)

    vi.useFakeTimers()

    vi.spyOn(selectors, "openRowMenu").mockResolvedValue(menu)

    let attempt = 0
    vi.spyOn(selectors, "clickArchiveInMenu").mockImplementation(async () => {
      attempt += 1
      if (attempt === 2) {
        row.remove()
      }
      return true
    })

    vi.spyOn(dom, "waitForPredicate")
      .mockRejectedValueOnce(new Error("Timed out"))
      .mockImplementation(async (predicate) => {
        const result = await predicate()
        if (!result) {
          throw new Error("Not archived yet")
        }
        return result as HTMLElement
      })

    const events: ArchiveProgress[] = []
    const summaryPromise = archive(scan(), (progress) => events.push(progress))

    await vi.advanceTimersByTimeAsync(ACTION_DELAY_MS)

    const summary = await summaryPromise

    expect(attempt).toBe(2)
    expect(summary.archived).toBe(1)
    expect(summary.failed).toHaveLength(0)
    expect(events.at(-1)?.summary).toEqual(summary)
  })

  it("reports attempts starting at one for each task", async () => {
    const firstTask = createTask({ id: "1", title: "Nerch First Task", tags: ["Community"] })
    const secondTask = createTask({ id: "2", title: "Nerch Second Task", tags: ["Community"] })
    document.body.append(firstTask, secondTask)

    const menu = document.createElement("div")
    menu.setAttribute("role", "menu")
    document.body.appendChild(menu)

    let currentRow: HTMLElement | null = null
    vi.spyOn(selectors, "openRowMenu").mockImplementation(async (row) => {
      currentRow = row
      return menu
    })

    vi.spyOn(selectors, "clickArchiveInMenu").mockImplementation(async () => {
      currentRow?.remove()
      return true
    })

    const events: ArchiveProgress[] = []
    await archive(scan(), (progress) => events.push(progress))

    const attemptEvents = events.filter((event) => event.status === "attempt")
    const attemptsByTask = new Map<string | undefined, number>()

    for (const event of attemptEvents) {
      const taskId = event.current?.task.metadata.id
      if (!attemptsByTask.has(taskId)) {
        attemptsByTask.set(taskId, event.current?.attempt ?? 0)
      }
    }

    expect(attemptEvents).toHaveLength(2)
    expect(attemptsByTask.get("1")).toBe(1)
    expect(attemptsByTask.get("2")).toBe(1)
  })
})
