import { spawn } from 'node:child_process'
import { mkdir, readFile } from 'node:fs/promises'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'

const courseId='trzbd'
const basePath='/2026-TRZBD-lecture/'
const port=5295
const course = JSON.parse(await readFile('public/course.json','utf8'))
const allTopics = course.lectures.map(l=>l.id)
const args = process.argv.slice(2)
const valueAfter = (flag) => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}
const requestedTopic = valueAfter('--topic')
const requestedVariant = valueAfter('--variant')
if (requestedTopic && !allTopics.includes(requestedTopic)) throw new Error(`Unknown topic: ${requestedTopic}`)
if (requestedVariant && requestedVariant !== 'student') throw new Error('PDF is student-only. Teacher scenarios are in private/teacher-pack.json.')
const topics = requestedTopic ? [requestedTopic] : allTopics
const variants = ['student']
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
const geometry=[]
try {
  await waitForServer()
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  await context.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value))
  }, { key: `lecture:${basePath}:${courseId}:profile`, value: {...profile,department:profile.organizationUnit||''} })
  const page = await context.newPage()
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })

  for (const topic of topics) {
    for (const variant of variants) {
      const url = `${baseUrl}?mode=print&scope=${encodeURIComponent(topic)}`
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.locator('.print-page').last().waitFor()
      await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(im=>im.decode().catch(()=>{})))})
      const issues=await page.locator('.slide-frame').evaluateAll(els=>els.flatMap(el=>{
        const r=el.getBoundingClientRect();return [...el.querySelectorAll('.slide-copy h2,.slide-copy p,.slide-copy li,.slide-copy td,.slide-copy figcaption,.slide-footer')].filter(e=>{const b=e.getBoundingClientRect();return b.bottom>r.bottom+2||b.right>r.right+2||b.left<r.left-2}).map(e=>({slide:el.getAttribute('data-slide-id'),text:e.textContent?.slice(0,100)}))
      }));geometry.push({topic,issues});
      const pageElements = await page.locator('.print-page').count()
      const expected=course.lectures.find(l=>l.id===topic).slides.length
      if (pageElements !== expected) throw new Error(`${topic}/${variant}: DOM has ${pageElements} pages`)
      const outputDir = path.resolve(valueAfter('--out')||path.join('outputs','pdf','student'))
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
      if (pdf.getPageCount() !== expected) throw new Error(`${topic}/${variant}: PDF has ${pdf.getPageCount()} pages`)
      console.log(`Exported ${variant}: ${topic} — ${expected} pages`)
    }
  }
  await mkdir('reports',{recursive:true});await fs.promises.writeFile('reports/pdf-geometry.json',JSON.stringify(geometry,null,2));
} finally {
  await browser?.close()
  server.kill()
}
