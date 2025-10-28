import { describe, expect, it, vi } from "vitest"

import {
  clickElement,
  queryByText,
  smoothScrollIntoView,
  waitFor,
  waitForPredicate
} from "../src/lib/dom"

describe("queryByText", () => {
  it("finds elements by exact text", () => {
    document.body.innerHTML = `
      <div>
        <span data-testid="greeting">Hello World</span>
        <span data-testid="farewell">Goodbye</span>
      </div>
    `

    const result = queryByText(document.body, "Hello World", {
      selector: "[data-testid]",
      exact: true
    })

    expect(result?.getAttribute("data-testid")).toBe("greeting")
  })

  it("supports partial matches", () => {
    document.body.innerHTML = `
      <div>
        <button>Archive Nerch Thread</button>
      </div>
    `

    const result = queryByText(document.body, "nerch", {
      selector: "button",
      exact: false
    })

    expect(result?.tagName).toBe("BUTTON")
  })

  it("matches regular expressions", () => {
    document.body.innerHTML = `
      <div>
        <p>   Nerch hype train   </p>
      </div>
    `

    const result = queryByText(document.body, /nerch hype/i, {
      selector: "p"
    })

    expect(result?.textContent?.trim()).toBe("Nerch hype train")
  })
})

describe("wait utilities", () => {
  it("waitForPredicate resolves when predicate returns a truthy value", async () => {
    let attempts = 0
    const result = await waitForPredicate(() => {
      attempts += 1
      return attempts > 2 ? "ready" : null
    }, {
      interval: 10,
      timeout: 100
    })

    expect(result).toBe("ready")
    expect(attempts).toBeGreaterThan(2)
  })

  it("waitFor resolves once the element appears", async () => {
    vi.useFakeTimers()

    try {
      const waitPromise = waitFor<HTMLElement>("#loaded", { timeout: 200, interval: 10 })

      setTimeout(() => {
        const element = document.createElement("div")
        element.id = "loaded"
        document.body.appendChild(element)
      }, 20)

      await vi.advanceTimersByTimeAsync(60)

      const element = await waitPromise

      expect(element?.id).toBe("loaded")
    } finally {
      vi.useRealTimers()
    }
  })
})

describe("DOM interactions", () => {
  it("clickElement throws when target is missing", () => {
    expect(() => clickElement(null)).toThrowError("Cannot click an undefined element")
  })

  it("delegates to the native click method", () => {
    const button = document.createElement("button")
    const clickSpy = vi.spyOn(button, "click")

    clickElement(button)

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it("scrolls elements into view smoothly", () => {
    const element = document.createElement("div") as HTMLElement & {
      scrollIntoView: (options?: ScrollIntoViewOptions) => void
    }
    const scrollSpy = vi.fn()
    element.scrollIntoView = scrollSpy

    smoothScrollIntoView(element, { behavior: "smooth" })

    expect(scrollSpy).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
      inline: "nearest"
    })
  })
})
