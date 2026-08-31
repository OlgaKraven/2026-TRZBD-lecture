import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument } from 'pdf-lib'

const roots = [path.resolve('outputs', 'pdf', 'student'), path.resolve('outputs', 'pdf', 'teacher')]
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
    if (pdf.getPageCount() !== 85) throw new Error(`${file}: expected 85 pages, got ${pdf.getPageCount()}`)
    checked += 1
  }
}
if (!checked) throw new Error('No exported PDFs found')
console.log(`PDF page-count check passed: ${checked} files, 85 pages each`)
