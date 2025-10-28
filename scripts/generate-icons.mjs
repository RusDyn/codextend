import { mkdir, stat } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, "..")
const assetsDir = join(projectRoot, "assets")
const svgSource = join(assetsDir, "icon.svg")
const pngTarget = join(assetsDir, "icon.png")

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true })
}

async function iconNeedsUpdate() {
  try {
    const [svgStats, pngStats] = await Promise.all([
      stat(svgSource),
      stat(pngTarget)
    ])
    return svgStats.mtimeMs > pngStats.mtimeMs
  } catch (error) {
    return true
  }
}

async function generate() {
  await ensureDir(assetsDir)

  if (!(await iconNeedsUpdate())) {
    console.log("Icon PNG is up to date; skipping generation.")
    return
  }

  console.log("Generating icon.png from icon.svg using sharp...")

  await sharp(svgSource, { density: 512 })
    .resize(512, 512, { fit: "contain" })
    .png({ compressionLevel: 9 })
    .toFile(pngTarget)

  console.log("icon.png generated at", pngTarget)
}

try {
  await generate()
} catch (error) {
  console.error("Failed to generate icon.png from icon.svg", error)
  process.exitCode = 1
}
