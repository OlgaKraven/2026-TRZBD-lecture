import { spawn } from 'node:child_process'
import { mkdir, readFile } from 'node:fs/promises'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'

const basePath = '/2026-TRZBD-lecture/'
const port = 5294
const source = await readFile(path.resolve('src', 'data', 'courseData.ts'), 'utf8')
const allTopics = [...source.matchAll(/id:\s*'(s\d{2}-[^']+)'/g)].map((match) => match[1])
const args = process.argv.slice(2)
const valueAfter = (flag) => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}
const requestedTopic = valueAfter('--topic')
const requestedVariant = valueAfter('--variant')
if (requestedTopic && !allTopics.includes(requestedTopic)) throw new Error(`Unknown topic: ${requestedTopic}`)
if (requestedVariant && !['student', 'teacher'].includes(requestedVariant)) throw new Error(`Unknown variant: ${requestedVariant}`)
const topics = requestedTopic ? [requestedTopic] : allTopics
const variants = requestedVariant ? [requestedVariant] : ['student', 'teacher']
if (!fs.existsSync(path.resolve('dist', 'index.html'))) throw new Error('dist is missing. Run npm run build first.')

const profilePath = path.resolve('config', 'teacher-profile.json')
let profile = { fullName: '', position: '', organizationUnit: '' }
if (fs.existsSync(profilePath)) profile = JSON.parse(await readFile(profilePath, 'utf8'))

const viteBin = path.resolve('node_modules', 'vite', 'bin', 'vite.js')
const server = spawn(process.execPath, [viteBin, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})
let serverLog = ''
server.stdout.on('data', (chunk) => { serverLog += chunk.toString() })
server.stderr.on('data', (chunk) => { serverLog += chunk.toString() })

const baseUrl = `http://127.0.0.1:${port}${basePath}`
const waitForServer = async () => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {
      // The preview server may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Preview server did not start. ${serverLog}`)
}
let browser
try {
  await waitForServer()
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  await context.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value))
  }, { key: 'trzbd.teacherProfile', value: profile })
  const page = await context.newPage()
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })

  for (const topic of topics) {
    for (const variant of variants) {
      const url = `${baseUrl}print?topic=${encodeURIComponent(topic)}&variant=${variant}`
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.waitForFunction(() => document.body.dataset.printReady === 'true', undefined, { timeout: 60_000 })
      const pageElements = await page.locator('.print-page').count()
      if (pageElements !== 85) throw new Error(`${topic}/${variant}: DOM has ${pageElements} pages`)
      const outputDir = path.resolve('outputs', 'pdf', variant)
      await mkdir(outputDir, { recursive: true })
      const outputPath = path.join(outputDir, `${topic}.pdf`)
      await page.pdf({
        path: outputPath,
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        tagged: true,
        outline: true,
      })
      const pdf = await PDFDocument.load(await readFile(outputPath))
      if (pdf.getPageCount() !== 85) throw new Error(`${topic}/${variant}: PDF has ${pdf.getPageCount()} pages`)
      console.log(`Exported ${variant}: ${topic} — 85 pages`)
    }
  }
} finally {
  await browser?.close()
  server.kill()
}
