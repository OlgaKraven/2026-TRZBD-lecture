import { describe, expect, it } from 'vitest'
import { course, topics, validateCourseData } from '../src/data/courseData'
import { buildDeck, countServiceSlides } from '../src/deck/buildDeck'
import { normalizeOrganizationUnit } from '../src/lib/teacherProfile'
import {joinRows,joinCase,transactionSnapshot} from '../src/SubjectModel'

describe('independent subject models',()=>{
 it('changes the complete result when the outer predicate moves between WHERE and ON',()=>{
  expect(joinCase('question-outer','base').result.map(r=>r.left)).toEqual(['B4'])
  expect(joinCase('question-outer','compare').result.map(r=>[r.left,r.right])).toEqual([['B4','R4'],['B5','NULL']])
 })
 it('recomputes COUNT expression when the missing child becomes a real row',()=>{
  expect(joinCase('question-aggregate','base').counts[1]).toEqual({id:'B5',all:1,keys:0})
  expect(joinCase('question-aggregate','compare').counts[1]).toEqual({id:'B5',all:1,keys:1})
 })
 it('keeps duplicate matches and the provenance of an outer NULL',()=>{
  const rows=[{id:'O1',parent:'C1'},{id:'O2',parent:'C1'},{id:'O3',parent:null}]
  expect(joinRows(['C1','C2'],rows,'INNER')).toEqual([{left:'C1',right:'O1',origin:'совпадение ON'},{left:'C1',right:'O2',origin:'совпадение ON'}])
  expect(joinRows(['C1','C2'],rows,'LEFT')).toHaveLength(3)
  expect(joinRows(['C1','C2'],rows,'LEFT')[2]).toEqual({left:'C2',right:'NULL',origin:'NULL добавлен LEFT JOIN'})
 })
 it('restores the whole transaction snapshot after rollback or stepping back',()=>{
  expect(transactionSnapshot(1,true)).toEqual({status:'CLOSED',works:0,audit:1,transaction:'Не подтверждено'})
  expect(transactionSnapshot(3,true)).toEqual({status:'WORK',works:0,audit:0,transaction:'ROLLBACK'})
  expect(transactionSnapshot(3,false)).toEqual({status:'CLOSED',works:1,audit:1,transaction:'COMMIT'})
  expect(transactionSnapshot(0,true)).toEqual({status:'WORK',works:0,audit:0,transaction:'До операции'})
 })
})

describe('teacher profile normalization', () => {
  it.each([
    ['кафедра кафедра Цифровой экономики', 'кафедра Цифровой экономики'],
    ['Лаборатория лаборатория баз данных', 'Лаборатория баз данных'],
    ['лаборатория баз данных', 'лаборатория баз данных'],
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
