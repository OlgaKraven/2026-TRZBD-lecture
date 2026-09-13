import { expect, test } from '@playwright/test'
import { course, topics } from '../src/data/courseData'

test('catalog contains approved topics and semester filters', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('./')
  await expect(page.locator('.topic-card')).toHaveCount(topics.length)
  for (const semester of course.semesters) {
    await page.getByRole('button', { name: `${semester} семестр` }).click()
    await expect(page.locator('.topic-card')).toHaveCount(topics.filter((topic) => topic.semester === semester).length)
  }
  await expect(page.locator('.brand-lockup img')).toHaveJSProperty('complete', true)
  await expect(page.locator('.hero-mascot img')).toHaveJSProperty('complete', true)
  expect(errors).toEqual([])
})

test('responsive catalog has no horizontal overflow at required sizes', async ({ page }) => {
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 360, height: 800 },
  ]
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto('./')
    const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
    expect(sizes.scroll, `overflow at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(sizes.client)
    await expect(page.getByRole('button', { name: 'Открыть' }).first()).toBeVisible()
  }
})

test('direct links, keyboard navigation and final screen work', async ({ page }) => {
  await page.goto(`./?topic=${topics[0].id}&slide=1`)
  await expect(page.locator('.slide-counter')).toHaveText('1 / 85')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.slide-counter')).toHaveText('2 / 85')
  await page.goto(`./?topic=${topics[0].id}&slide=85`)
  await expect(page.getByRole('heading', { name: 'Вопросы от аудитории' })).toBeVisible()
  await expect(page.locator('.mascot-mask img').first()).toHaveJSProperty('complete', true)
})

test('every approved topic opens directly with exactly 85 screens', async ({ page }) => {
  for (const topic of topics) {
    await page.goto(`./?topic=${topic.id}&slide=1`)
    await expect(page.locator('.slide-counter'), topic.id).toHaveText('1 / 85')
    await expect(page.getByRole('heading', { name: topic.title })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Печать для преподавателя' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Печать для студента' })).toHaveCount(0)
  }
})

test('invalid topic and slide recover without runtime crash', async ({ page }) => {
  await page.goto('./?topic=does-not-exist&slide=900')
  await expect(page.getByRole('status')).toContainText('не найдена')
  await expect(page.locator('.topic-card')).toHaveCount(topics.length)
})

test('materials QR and printable route are complete', async ({ page }) => {
  await page.goto(`./?topic=${topics[0].id}&slide=5`)
  await expect(page.getByAltText('QR-код: материалы МДК.11.01')).toHaveJSProperty('complete', true)
  await expect(page.getByRole('link', { name: course.materialsUrl })).toHaveAttribute('href', course.materialsUrl)

  await page.goto(`./print?topic=${topics[0].id}&variant=teacher`)
  await page.waitForFunction(() => document.body.dataset.printReady === 'true')
  await expect(page.locator('.print-page')).toHaveCount(85)
  await expect(page.locator('.print-page').nth(84).getByRole('heading', { name: 'Вопросы от аудитории' })).toBeVisible()
})
