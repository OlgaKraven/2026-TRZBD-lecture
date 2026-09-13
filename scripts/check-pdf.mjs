import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument } from 'pdf-lib'

const roots = [path.resolve(process.argv[2]||path.join('outputs','pdf','student'))]
const course=JSON.parse(await readFile('public/course.json','utf8'))
let checked = 0
for (const root of roots) {
  let entries = []
  try {
    entries = await readdir(root)
  } catch {
    continue
  }
  for (const entry of entries.filter((name) => name.endsWith('.pdf'))) {
    const file = path.join(root, entry)
    const pdf = await PDFDocument.load(await readFile(file))
    const expected=course.lectures.find(l=>l.id===entry.replace(/\.pdf$/,''))?.slides.length
    if (pdf.getPageCount() !== expected) throw new Error(`${file}: expected ${expected} pages, got ${pdf.getPageCount()}`)
    checked += 1
  }
}
if (!checked) throw new Error('No exported PDFs found')
console.log(`PDF page-count check passed: ${checked} files; counts match course.json`)
