import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  SELECTORS,
  clickArchiveInMenu,
  createTaskNode,
  extractTaskMetadata,
  getTaskRows,
  getTaskTags,
  getTaskTitle,
  openRowMenu
} from "../src/lib/selectors"

describe("task selector helpers", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section>
        <article data-testid="task-row" data-task-id="123" data-task-status="active">
          <h2 data-testid="task-title">Write docs</h2>
          <div class="tags">
            <span data-testid="task-tag">docs</span>
            <span data-testid="task-tag">writing</span>
          </div>
          <button type="button" data-testid="task-row-menu-button">Menu</button>
        </article>
        <article data-testid="task-row" data-task-id="456" data-task-status="backlog" data-task-archived="true">
          <h2 data-testid="task-title">Fix bug</h2>
          <div class="tags">
            <span data-testid="task-tag">bug</span>
          </div>
          <button type="button" data-testid="task-row-menu-button">Menu</button>
        </article>
        <div role="menu" data-testid="task-menu">
          <button role="menuitem" data-testid="task-archive">Archive</button>
        </div>
      </section>
    `
  })

  it("collects task rows", () => {
    const rows = getTaskRows()
    expect(rows).toHaveLength(2)
  })

  it("returns task title", () => {
    const [row] = getTaskRows()
    const title = getTaskTitle(row)
    expect(title?.textContent).toBe("Write docs")
  })

  it("returns associated tags", () => {
    const [row] = getTaskRows()
    const tags = getTaskTags(row)
    expect(tags.map((tag) => tag.textContent?.trim())).toEqual(["docs", "writing"])
  })

  it("extracts metadata", () => {
    const [first, second] = getTaskRows()
    expect(extractTaskMetadata(first)).toEqual({ id: "123", status: "active", archived: undefined })
    expect(extractTaskMetadata(second)).toEqual({ id: "456", status: "backlog", archived: true })
  })

  it("creates a task node snapshot", () => {
    const [row] = getTaskRows()
    const node = createTaskNode(row)
    expect(node.row).toBe(row)
    expect(node.title?.getAttribute("data-testid")).toBe("task-title")
    expect(node.tags).toHaveLength(2)
    expect(node.menuTrigger?.getAttribute("data-testid")).toBe("task-row-menu-button")
    expect(node.metadata).toEqual({ id: "123", status: "active", archived: undefined })
  })

  it("opens the contextual menu via click", async () => {
    const [row] = getTaskRows()
    const button = row.querySelector<HTMLButtonElement>(SELECTORS.menuTrigger)!
    const clickSpy = vi.spyOn(button, "click")

    const menu = await openRowMenu(row)

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(menu?.getAttribute("data-testid")).toBe("task-menu")
  })

  it("clicks the archive action in the menu", async () => {
    const archive = document.querySelector<HTMLButtonElement>(SELECTORS.archiveAction)!
    const clickSpy = vi.spyOn(archive, "click")

    const result = await clickArchiveInMenu()

    expect(result).toBe(true)
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })
})

describe("task selector helpers (fallback selectors)", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section>
        <div data-task-id="789" data-status="pending">
          <h3 role="heading">Draft response</h3>
          <div class="tags">
            <span data-task-tag>draft</span>
            <span data-task-tag>nerch</span>
          </div>
          <button type="button" aria-haspopup="menu" aria-label="More task actions">Menu</button>
        </div>
        <div data-task-id="012" data-status="backlog" data-archived="true">
          <h3 role="heading">Review submission</h3>
          <div class="tags">
            <span data-task-tag>review</span>
          </div>
          <button type="button" aria-haspopup="menu" aria-label="More task actions">Menu</button>
        </div>
        <div role="menu" data-qa="codex-task-menu">
          <button role="menuitem" data-action="archive">Archive</button>
        </div>
      </section>
    `
  })

  it("collects task rows", () => {
    const rows = getTaskRows()
    expect(rows).toHaveLength(2)
  })

  it("returns task title", () => {
    const [row] = getTaskRows()
    const title = getTaskTitle(row)
    expect(title?.textContent).toBe("Draft response")
  })

  it("returns associated tags", () => {
    const [row] = getTaskRows()
    const tags = getTaskTags(row)
    expect(tags.map((tag) => tag.textContent?.trim())).toEqual(["draft", "nerch"])
  })

  it("extracts metadata", () => {
    const [first, second] = getTaskRows()
    expect(extractTaskMetadata(first)).toEqual({ id: "789", status: "pending", archived: undefined })
    expect(extractTaskMetadata(second)).toEqual({ id: "012", status: "backlog", archived: true })
  })

  it("creates a task node snapshot", () => {
    const [row] = getTaskRows()
    const node = createTaskNode(row)
    expect(node.row).toBe(row)
    expect(node.title?.textContent?.trim()).toBe("Draft response")
    expect(node.tags).toHaveLength(2)
    expect(node.menuTrigger?.getAttribute("aria-haspopup")).toBe("menu")
    expect(node.metadata).toEqual({ id: "789", status: "pending", archived: undefined })
  })

  it("opens the contextual menu via click", async () => {
    const [row] = getTaskRows()
    const button = row.querySelector<HTMLButtonElement>(SELECTORS.menuTrigger)!
    const clickSpy = vi.spyOn(button, "click")

    const menu = await openRowMenu(row)

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(menu?.getAttribute("data-qa")).toBe("codex-task-menu")
  })

  it("clicks the archive action in the menu", async () => {
    const archive = document.querySelector<HTMLButtonElement>(SELECTORS.archiveAction)!
    const clickSpy = vi.spyOn(archive, "click")

    const result = await clickArchiveInMenu()

    expect(result).toBe(true)
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })
})
