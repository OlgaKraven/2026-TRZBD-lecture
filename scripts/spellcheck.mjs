import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const roots = ['src', 'README.md', 'SOURCES.md', 'docs']
const extensions = new Set(['.ts', '.tsx', '.md', '.html'])
const files = []
const dictionary = JSON.parse(await readFile('spellcheck.config.json', 'utf8'))
if (!Array.isArray(dictionary.allowedTerms) || dictionary.allowedTerms.length === 0) {
  throw new Error('The project dictionary must contain allowedTerms')
}

const collect = async (entry) => {
  try {
    const statEntries = await readdir(entry, { withFileTypes: true })
    for (const item of statEntries) {
      const next = path.join(entry, item.name)
      if (item.isDirectory()) await collect(next)
      else if (extensions.has(path.extname(item.name))) files.push(next)
    }
  } catch {
    if (extensions.has(path.extname(entry))) files.push(entry)
  }
}

for (const root of roots) await collect(root)

const forbidden = [
  [/каферда/giu, 'каферда'],
  [/литерататура/giu, 'литерататура'],
  [/сладйл?/giu, 'сладй/сладйл'],
  [/\bворфлоу\b/giu, 'ворфлоу'],
  [/кафедра\s+кафедра/giu, 'двойное «кафедра»'],
  [/лаборатория\s+лаборатория/giu, 'двойное «лаборатория»'],
]

const problems = []
for (const file of files) {
  if (file.endsWith('.test.ts') || file.endsWith('teacherProfile.ts')) continue
  const text = await readFile(file, 'utf8')
  for (const [pattern, label] of forbidden) {
    if (pattern.test(text)) problems.push(`${file}: ${label}`)
    pattern.lastIndex = 0
  }
  const duplicateWord = /\b([А-Яа-яЁё]{4,})\s+\1\b/giu
  const match = duplicateWord.exec(text)
  if (match) problems.push(`${file}: повтор слова «${match[1]}»`)
}

if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
console.log(`Spellcheck passed: ${files.length} source files checked; ${dictionary.allowedTerms.length} allowed terms loaded`)
