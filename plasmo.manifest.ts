const manifest = {
  name: "Codextend",
  description: "Chrome extension to extend OpenAI Codex cloud functionality",
  permissions: ["storage", "scripting", "activeTab"],
  host_permissions: ["https://chatgpt.com/*", "https://chat.openai.com/*"]
} satisfies Partial<chrome.runtime.ManifestV3>

export default manifest
