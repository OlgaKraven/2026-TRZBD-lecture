import { describe, expect, it } from 'vitest'
import { course, topics, validateCourseData } from '../src/data/courseData'
import { buildDeck, countServiceSlides } from '../src/deck/buildDeck'
import { normalizeOrganizationUnit } from '../src/lib/teacherProfile'

describe('teacher profile normalization', () => {
  it.each([
    ['кафедра кафедра Цифровой экономики', 'кафедра Цифровой экономики'],
    ['Лаборатория лаборатория ИИ', 'Лаборатория ИИ'],
    ['лаборатория искусственного интеллекта', 'лаборатория искусственного интеллекта'],
    ['  Кафедра   информационных   систем  ', 'Кафедра информационных систем'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeOrganizationUnit(input)).toBe(expected)
  })

  it('does not replace laboratory with department', () => {
    expect(normalizeOrganizationUnit('лаборатория прикладной аналитики')).toContain('лаборатория')
  })
})
describe('course and deck invariants', () => {
  it('validates topic configuration', () => {
    expect(validateCourseData()).toBe(true)
    expect(topics.filter((topic) => topic.semester === 7)).toHaveLength(7)
    expect(topics.filter((topic) => topic.semester === 8)).toHaveLength(6)
    expect(topics.reduce((sum, topic) => sum + topic.lectureHours, 0)).toBe(38)
    expect(topics.filter((topic) => topic.semester === 7).reduce((sum, topic) => sum + topic.lectureHours, 0)).toBe(20)
    expect(topics.filter((topic) => topic.semester === 8).reduce((sum, topic) => sum + topic.lectureHours, 0)).toBe(18)
    expect(topics.flatMap((topic) => topic.labNumbers).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 16 }, (_, index) => index + 1),
    )
    expect(course.totals).toEqual({
      allHours: 136,
      lectureHours: 38,
      labHours: 64,
      consultationHours: 2,
      independentHours: 32,
    })
  })

  it('keeps topic identifiers unique and source-backed', () => {
    expect(new Set(topics.map((topic) => topic.id)).size).toBe(topics.length)
    topics.forEach((topic) => {
      expect(topic.semester).toBeGreaterThan(0)
      expect(topic.sourceTitle.length).toBeGreaterThan(20)
      expect(topic.sourceIds.length).toBeGreaterThan(0)
      expect(topic.questions).toHaveLength(8)
      expect(topic.competencies.length).toBeGreaterThan(0)
      expect(topic.lectureHours).toBeGreaterThan(0)
      expect(topic.labNumbers.length).toBeGreaterThan(0)
    })
  })

  it.each(topics.map((topic) => [topic.id, topic] as const))('builds exactly 85 screens for %s', (_id, topic) => {
    const deck = buildDeck(topic, course)
    expect(deck).toHaveLength(85)
    expect(countServiceSlides(deck)).toBe(5)
    expect(deck.filter((slide) => ![2, 3, 4, 5, 85].includes(slide.number))).toHaveLength(80)
    expect(deck[84].title).toBe('Вопросы от аудитории')
    expect(deck.filter((slide) => slide.kind === 'divider')).toHaveLength(8)
    deck.forEach((slide) => expect(slide.sourceIds.length).toBeGreaterThan(0))
  })
})
