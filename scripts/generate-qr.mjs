import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import jsQR from 'jsqr'
import QRCode from 'qrcode'
import sharp from 'sharp'

const config = { id: 'trzbd', url: 'https://disk.yandex.ru/d/UoZtXrLwvVWVsQ' }

const outputDir = path.resolve('public', 'qr')
const outputPath = path.join(outputDir, `${config.id}-materials.png`)
const logoPath = path.resolve('public', 'brand', 'synergy-logo.png')
await mkdir(outputDir, { recursive: true })

const qr = await QRCode.toBuffer(config.url, {
  type: 'png',
  errorCorrectionLevel: 'H',
  width: 1200,
  margin: 4,
  color: { dark: '#1C1C1C', light: '#FFFFFF' },
})

const markSize = 150
const mark = await sharp(logoPath)
  .resize({ width: markSize, height: markSize, fit: 'contain', background: '#FFFFFF' })
  .png()
  .toBuffer()
const whitePlate = await sharp({
  create: { width: 190, height: 190, channels: 4, background: '#FFFFFF' },
})
  .composite([{ input: mark, left: 20, top: 20 }])
  .png()
  .toBuffer()

const framed = sharp({
  create: { width: 1264, height: 1264, channels: 4, background: '#ED131C' },
}).composite([
  { input: qr, left: 32, top: 32 },
  { input: whitePlate, left: 537, top: 537 },
])
await framed.png({ compressionLevel: 9 }).toFile(outputPath)

const decodedImage = await sharp(outputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const decoded = jsQR(
  new Uint8ClampedArray(decodedImage.data),
  decodedImage.info.width,
  decodedImage.info.height,
)
if (!decoded || decoded.data !== config.url) {
  throw new Error(`QR verification failed for ${config.id}`)
}
console.log(`QR verified: ${decoded.data} -> ${outputPath}`)
