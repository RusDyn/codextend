import "./style.css"
import * as React from "react"

function IndexPopup() {
  const [note, setNote] = React.useState("")

  return (
    <div className="min-h-[20rem] w-80 space-y-4 bg-slate-950 p-6 text-white">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Codextend</h1>
        <p className="text-sm text-slate-300">
          Quick access to Codex-enhancing tools for ChatGPT tabs.
        </p>
      </header>

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-slate-200">Scratchpad</span>
        <textarea
          className="h-24 w-full resize-none rounded-md border border-slate-700 bg-slate-900 p-2 text-sm placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="Jot down prompts or reminders..."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      <nav className="flex items-center justify-between text-sm text-indigo-300">
        <a
          className="font-medium hover:text-indigo-200"
          href="https://docs.plasmo.com"
          rel="noreferrer"
          target="_blank"
        >
          Plasmo Docs
        </a>
        <a
          className="font-medium hover:text-indigo-200"
          href="https://github.com/PlasmoHQ"
          rel="noreferrer"
          target="_blank"
        >
          GitHub
        </a>
      </nav>
    </div>
  )
}

export default IndexPopup
