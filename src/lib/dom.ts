export interface WaitForOptions {
  timeout?: number
  interval?: number
  maxInterval?: number
  backoffFactor?: number
  signal?: AbortSignal
}

const DEFAULT_TIMEOUT = 5000
const DEFAULT_INTERVAL = 50
const DEFAULT_MAX_INTERVAL = 1000
const DEFAULT_BACKOFF = 1.5

type Awaitable<T> = T | Promise<T>

function now(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now()
  }

  return Date.now()
}

function createTimeoutError(timeout: number): Error {
  const error = new Error(`Timed out in ${timeout}ms while waiting for condition`)
  error.name = "TimeoutError"
  return error
}

function createAbortError(reason: unknown): Error {
  if (reason instanceof Error) {
    return reason
  }

  const message = typeof reason === "string" ? reason : "Aborted"
  const error = new Error(message)
  error.name = "AbortError"
  return error
}

export async function waitForPredicate<T>(
  predicate: () => Awaitable<T | null | undefined | false>,
  {
    timeout = DEFAULT_TIMEOUT,
    interval = DEFAULT_INTERVAL,
    maxInterval = DEFAULT_MAX_INTERVAL,
    backoffFactor = DEFAULT_BACKOFF,
    signal
  }: WaitForOptions = {}
): Promise<T> {
  const start = now()
  let lastError: unknown

  return new Promise<T>((resolve, reject) => {
    let active = true
    let currentInterval = interval
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let retryId: ReturnType<typeof setTimeout> | undefined

    const clear = () => {
      active = false
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
      if (retryId !== undefined) {
        clearTimeout(retryId)
      }
    }

    const rejectWithError = (error: unknown) => {
      clear()
      reject(error instanceof Error ? error : new Error(String(error)))
    }

    const check = async () => {
      if (!active) {
        return
      }

      if (signal?.aborted) {
        rejectWithError(createAbortError(signal.reason))
        return
      }

      try {
        const value = await predicate()
        if (value) {
          clear()
          resolve(value as T)
          return
        }
      } catch (error) {
        lastError = error
      }

      if (timeout !== Infinity && now() - start >= timeout) {
        rejectWithError(lastError ?? createTimeoutError(timeout))
        return
      }

      const nextInterval = Math.min(maxInterval, currentInterval * backoffFactor)
      currentInterval = Number.isFinite(nextInterval) ? nextInterval : maxInterval
      retryId = setTimeout(check, currentInterval)
    }

    if (timeout !== Infinity) {
      timeoutId = setTimeout(() => {
        rejectWithError(lastError ?? createTimeoutError(timeout))
      }, timeout)
    }

    void check()
  })
}

export interface WaitForElementOptions extends WaitForOptions {
  root?: ParentNode
}

export async function waitFor<T extends Element>(
  selector: string,
  { root = document, ...options }: WaitForElementOptions = {}
): Promise<T> {
  return waitForPredicate<T | null>(
    () => root.querySelector<T>(selector),
    options
  ).then((element) => {
    if (!element) {
      throw createTimeoutError(options.timeout ?? DEFAULT_TIMEOUT)
    }

    return element
  })
}

export interface QueryByTextOptions {
  selector?: string
  exact?: boolean
  trim?: boolean
}

export function queryByText<T extends Element = Element>(
  container: ParentNode,
  text: string | RegExp,
  { selector = "*", exact = true, trim = true }: QueryByTextOptions = {}
): T | null {
  const candidates = Array.from(container.querySelectorAll<T>(selector))

  const normalize = (value: string | null | undefined): string => {
    if (!value) {
      return ""
    }

    return trim ? value.trim() : value
  }

  const matcher = (content: string): boolean => {
    if (text instanceof RegExp) {
      return text.test(content)
    }

    if (exact) {
      return content === text
    }

    return content.toLowerCase().includes(text.toLowerCase())
  }

  for (const element of candidates) {
    const content = normalize(element.textContent)
    if (matcher(content)) {
      return element
    }
  }

  return null
}

export function clickElement(target: Element | null | undefined): void {
  if (!target) {
    throw new Error("Cannot click an undefined element")
  }

  if (target instanceof SVGElement) {
    target.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true
      })
    )
    return
  }

  if (!(target instanceof HTMLElement)) {
    throw new Error("clickElement requires an HTMLElement or SVGElement")
  }

  const disabled = target.hasAttribute("disabled") || (target as HTMLButtonElement).disabled
  if (disabled) {
    throw new Error("Attempted to click a disabled element")
  }

  target.click()
}

export interface SmoothScrollOptions extends ScrollIntoViewOptions {}

export function smoothScrollIntoView(target: Element | null | undefined, options: SmoothScrollOptions = {}): void {
  if (!target) {
    return
  }

  const scrollOptions: ScrollIntoViewOptions = {
    behavior: options.behavior ?? "smooth",
    block: options.block ?? "center",
    inline: options.inline ?? "nearest"
  }

  try {
    target.scrollIntoView(scrollOptions)
  } catch (error) {
    console.warn("Failed to scroll element into view", error)
  }
}
