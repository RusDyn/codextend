import type { PointerEvent as ReactPointerEvent } from "react"
import { useEffect, useRef, useState } from "react"
import { createRoot, type Root } from "react-dom/client"

import Panel from "../ui/Panel"
import { usePanelStore } from "../ui/panelStore"
import {
  loadPanelPreferences,
  savePanelWidth,
  type PanelPreferences
} from "../lib/storage"
import { SELECTORS } from "../lib/selectors"

const PANEL_HOST_ID = "codextend-codex-panel-host"
const PANEL_OFFSET_STYLE_ID = "codextend-codex-panel-offset"
const PANEL_FLAG = "__codextendCodexPanelMounted__"

const DEFAULT_PANEL_WIDTH = 360
const MIN_PANEL_WIDTH = 280
const MAX_PANEL_WIDTH = 640

const ROUTE_CHECK_INTERVAL_MS = 500

const TASK_ROOT_SELECTORS = [
  SELECTORS.taskRow,
  '[data-testid="task-list"]',
  '[data-testid="task-table"]',
  '[data-testid="task-row-list"]'
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function isCodexRoute(pathname: string): boolean {
  return pathname.startsWith("/codex")
}

function updateContentOffset(width: number): void {
  const ownerDocument = document
  let style = ownerDocument.getElementById(PANEL_OFFSET_STYLE_ID) as HTMLStyleElement | null

  if (!style) {
    style = ownerDocument.createElement("style")
    style.id = PANEL_OFFSET_STYLE_ID
    ownerDocument.head.append(style)
  }

  const margin = width > 0 ? `${Math.round(width)}px` : "0px"
  style.textContent = `body { margin-right: ${margin} !important; transition: margin-right 120ms ease-in-out; }`
}

function removeContentOffset(): void {
  const style = document.getElementById(PANEL_OFFSET_STYLE_ID)
  if (style?.parentNode) {
    style.parentNode.removeChild(style)
  }
}

function detectTaskList(): boolean {
  return TASK_ROOT_SELECTORS.some((selector) => document.querySelector(selector))
}

function createTaskObserver(onAvailabilityChange: (available: boolean) => void): () => void {
  let previous = false

  const evaluate = () => {
    const available = detectTaskList()
    if (available !== previous) {
      previous = available
      onAvailabilityChange(available)
    }
  }

  const observer = new MutationObserver(() => {
    evaluate()
  })

  const target = document.body
  if (target) {
    observer.observe(target, { childList: true, subtree: true })
  }
  evaluate()

  return () => {
    observer.disconnect()
  }
}

interface PanelContainerProps {
  initialWidth: number
  onWidthChange: (width: number) => void
  onWidthCommit: (width: number) => void
}

function PanelContainer({ initialWidth, onWidthChange, onWidthCommit }: PanelContainerProps): JSX.Element {
  const [width, setWidth] = useState(() => clamp(initialWidth, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH))
  const widthRef = useRef(width)
  const pointerIdRef = useRef<number | null>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const moveListenerRef = useRef<((event: PointerEvent) => void) | null>(null)
  const upListenerRef = useRef<((event: PointerEvent) => void) | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    widthRef.current = width
    onWidthChange(width)
  }, [width, onWidthChange])

  useEffect(() => {
    return () => {
      onWidthChange(0)
      const moveListener = moveListenerRef.current
      const upListener = upListenerRef.current
      if (moveListener) {
        window.removeEventListener("pointermove", moveListener)
        moveListenerRef.current = null
      }
      if (upListener) {
        window.removeEventListener("pointerup", upListener)
        upListenerRef.current = null
      }
    }
  }, [onWidthChange])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const stopPropagation = (event: KeyboardEvent) => {
      if (!container.contains(event.target as Node)) {
        return
      }

      event.stopPropagation()
    }

    container.addEventListener("keydown", stopPropagation, true)
    container.addEventListener("keyup", stopPropagation, true)
    container.addEventListener("keypress", stopPropagation, true)

    return () => {
      container.removeEventListener("keydown", stopPropagation, true)
      container.removeEventListener("keyup", stopPropagation, true)
      container.removeEventListener("keypress", stopPropagation, true)
    }
  }, [])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }

    event.preventDefault()
    const pointerId = event.pointerId
    pointerIdRef.current = pointerId
    draggingRef.current = true
    setDragging(true)

    try {
      event.currentTarget.setPointerCapture(pointerId)
    } catch (error) {
      console.warn("Failed to set pointer capture on resize handle", error)
    }

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerIdRef.current || !draggingRef.current) {
        return
      }

      moveEvent.preventDefault()
      const nextWidth = clamp(window.innerWidth - moveEvent.clientX, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH)
      widthRef.current = nextWidth
      setWidth(nextWidth)
    }

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerIdRef.current) {
        return
      }

      upEvent.preventDefault()
      draggingRef.current = false
      setDragging(false)

      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      moveListenerRef.current = null
      upListenerRef.current = null

      const element = handleRef.current
      if (element && pointerIdRef.current !== null) {
        try {
          element.releasePointerCapture(pointerIdRef.current)
        } catch (error) {
          console.warn("Failed to release pointer capture on resize handle", error)
        }
      }

      pointerIdRef.current = null
      onWidthCommit(widthRef.current)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    moveListenerRef.current = handlePointerMove
    upListenerRef.current = handlePointerUp
  }

  const cursor = dragging ? "col-resize" : "default"

  return (
    <div
      ref={containerRef}
      style={{
        pointerEvents: "auto",
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        boxShadow: "-8px 0 24px rgba(15, 23, 42, 0.35)",
        backgroundColor: "transparent"
      }}
    >
      <style>
        {`
          .codextend-resize-handle {
            position: absolute;
            top: 0;
            left: -6px;
            width: 12px;
            height: 100%;
            cursor: col-resize;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
          }

          .codextend-resize-handle::before {
            content: "";
            width: 2px;
            height: 40%;
            border-radius: 9999px;
            background: rgba(148, 163, 184, 0.3);
            transition: background 120ms ease-in-out;
          }

          .codextend-resize-handle:hover::before,
          .codextend-resize-handle.is-dragging::before {
            background: rgba(129, 140, 248, 0.6);
          }
        `}
      </style>
      <div
        ref={handleRef}
        className={`codextend-resize-handle${dragging ? " is-dragging" : ""}`}
        onPointerDown={handlePointerDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize nerch panel"
        style={{ cursor: "col-resize" }}
      />
      <div
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          height: "100%",
          position: "relative",
          pointerEvents: "auto",
          cursor
        }}
      >
        <Panel />
      </div>
    </div>
  )
}

async function readPanelPreferences(): Promise<PanelPreferences> {
  try {
    return await loadPanelPreferences()
  } catch (error) {
    console.warn("Failed to load panel preferences", error)
    return {}
  }
}

async function mountPanel(): Promise<() => void> {
  const ownerDocument = document
  const existingHost = ownerDocument.getElementById(PANEL_HOST_ID)
  if (existingHost) {
    return () => {}
  }

  const host = ownerDocument.createElement("div")
  host.id = PANEL_HOST_ID
  host.style.position = "fixed"
  host.style.top = "0"
  host.style.right = "0"
  host.style.height = "100vh"
  host.style.zIndex = "2147483646"
  host.style.pointerEvents = "none"
  host.style.display = "flex"
  host.style.alignItems = "stretch"
  host.style.justifyContent = "stretch"

  ownerDocument.body.append(host)

  const shadow = host.attachShadow({ mode: "open" })
  const rootContainer = ownerDocument.createElement("div")
  shadow.append(rootContainer)

  const root: Root = createRoot(rootContainer)

  const preferences = await readPanelPreferences()
  const initialWidth = clamp(preferences.width ?? DEFAULT_PANEL_WIDTH, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH)

  const store = usePanelStore.getState()
  store.setConfirmAcknowledged(Boolean(preferences.confirmAcknowledged))
  store.setPanelEnabled(false, "Waiting for Codex tasks to finish loading before scanning.")

  const handleWidthChange = (nextWidth: number) => {
    const clamped = clamp(nextWidth, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH)
    host.style.width = `${clamped}px`
    updateContentOffset(clamped)
  }

  const handleWidthCommit = (nextWidth: number) => {
    const clamped = clamp(nextWidth, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH)
    host.style.width = `${clamped}px`
    updateContentOffset(clamped)
    void savePanelWidth(clamped).catch((error) => {
      console.warn("Failed to persist panel width", error)
    })
  }

  handleWidthChange(initialWidth)

  root.render(
    <PanelContainer
      initialWidth={initialWidth}
      onWidthChange={handleWidthChange}
      onWidthCommit={handleWidthCommit}
    />
  )

  const availabilityCleanup = createTaskObserver((available) => {
    if (available) {
      store.setPanelEnabled(true)
    } else {
      store.setPanelEnabled(false, "Waiting for Codex tasks to finish loading before scanning.")
    }
  })

  return () => {
    availabilityCleanup()
    root.unmount()
    removeContentOffset()
    if (host.isConnected) {
      host.remove()
    }
    store.setPanelEnabled(false, "Codex tasks not detected. Navigate to the task queue to use the panel.")
  }
}

async function run(): Promise<void> {
  const globalScope = window as typeof window & { [PANEL_FLAG]?: boolean }
  if (globalScope[PANEL_FLAG]) {
    return
  }
  globalScope[PANEL_FLAG] = true

  let cleaningPanel: (() => void) | null = null
  let mounting = false

  const ensurePanelForRoute = async () => {
    if (mounting) {
      return
    }

    if (isCodexRoute(window.location.pathname)) {
      if (!cleaningPanel) {
        mounting = true
        try {
          cleaningPanel = await mountPanel()
        } catch (error) {
          console.error("Failed to mount Codextend panel", error)
        } finally {
          mounting = false
        }
      }
    } else if (cleaningPanel) {
      cleaningPanel()
      cleaningPanel = null
    }
  }

  await ensurePanelForRoute()

  const handleNavigation = () => {
    void ensurePanelForRoute()
  }

  const intervalId = window.setInterval(() => {
    void ensurePanelForRoute()
  }, ROUTE_CHECK_INTERVAL_MS)

  window.addEventListener("popstate", handleNavigation)
  window.addEventListener("hashchange", handleNavigation)

  const cleanupHistory = patchHistory(() => {
    void ensurePanelForRoute()
  })

  const cleanup = () => {
    window.removeEventListener("popstate", handleNavigation)
    window.removeEventListener("hashchange", handleNavigation)
    window.clearInterval(intervalId)
    cleanupHistory()
    if (cleaningPanel) {
      cleaningPanel()
      cleaningPanel = null
    }
    delete globalScope[PANEL_FLAG]
  }

  window.addEventListener("beforeunload", cleanup, { once: true })
}

function patchHistory(listener: () => void): () => void {
  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState

  history.pushState = function patchedPushState(...args) {
    const result = originalPushState.apply(this, args as Parameters<typeof history.pushState>)
    listener()
    return result
  }

  history.replaceState = function patchedReplaceState(...args) {
    const result = originalReplaceState.apply(this, args as Parameters<typeof history.replaceState>)
    listener()
    return result
  }

  return () => {
    history.pushState = originalPushState
    history.replaceState = originalReplaceState
  }
}

void run()
