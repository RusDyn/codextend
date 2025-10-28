import { afterEach, beforeEach, vi } from "vitest"

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

beforeEach(() => {
  document.body.innerHTML = ""
})
