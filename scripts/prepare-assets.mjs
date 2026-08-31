import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const sourceDir = path.resolve(root, 'prompt-assets', 'brand')
const brandDir = path.resolve(root, 'public', 'brand')
const mascotDir = path.join(brandDir, 'mascot')

await mkdir(mascotDir, { recursive: true })

await copyFile(path.join(sourceDir, 'synergy-logo-vertical.png'), path.join(brandDir, 'synergy-logo.png'))
await copyFile(path.join(sourceDir, 'divider-arrow-light.png'), path.join(brandDir, 'divider-arrow-light.png'))
await copyFile(path.join(sourceDir, 'side-ornament.png'), path.join(brandDir, 'side-ornament.png'))
await copyFile(path.join(sourceDir, 'trzbd-rhino.png'), path.join(mascotDir, 'trzbd-database-rhino.png'))
await copyFile(path.join(sourceDir, 'trzbd-rhino.png'), path.join(mascotDir, 'trzbd-database-rhino-pdf.png'))

await sharp(path.join(sourceDir, 'trzbd-rhino.png'))
  .resize({ width: 560, height: 560, fit: 'contain' })
  .png({ compressionLevel: 9 })
  .toFile(path.join(mascotDir, 'trzbd-database-rhino-catalog.png'))

await sharp(path.join(sourceDir, 'trzbd-rhino.png'))
  .webp({ quality: 92, alphaQuality: 100 })
  .toFile(path.join(mascotDir, 'trzbd-database-rhino.webp'))

const cardText = Buffer.from(`
  <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <style>
      .k { font: 800 30px Arial, sans-serif; letter-spacing: 3px; fill: #ffbbc0; }
      .h { font: 900 70px Arial, sans-serif; fill: #ffffff; }
      .s { font: 600 28px Arial, sans-serif; fill: #e0e1e5; }
    </style>
    <text x="70" y="115" class="k">МДК.11.01 · 4 КУРС</text>
    <text x="70" y="215" class="h">Разработка и защита</text>
    <text x="70" y="300" class="h">баз данных</text>
    <text x="70" y="390" class="s">13 тем · 7–8 семестры · MySQL 8.4</text>
  </svg>
`)

const mascot = await sharp(path.join(sourceDir, 'trzbd-rhino.png'))
  .resize({ width: 520, height: 520, fit: 'contain' })
  .png()
  .toBuffer()

await sharp({
  create: { width: 1200, height: 630, channels: 4, background: '#1C1C1C' },
})
  .composite([
    {
      input: Buffer.from(
        '<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><path d="M760 0H1200V630H650L860 315Z" fill="#ED131C"/><path d="M0 596H1200V630H0Z" fill="#ED131C"/></svg>',
      ),
    },
    { input: mascot, left: 700, top: 58 },
    { input: cardText, left: 0, top: 0 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(path.resolve(root, 'public', 'og.png'))

console.log('Brand assets prepared from prompt-assets/brand')
