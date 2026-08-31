import type { CourseConfig, TestAnswers } from '../types'

const safeParse = <T>(value: string | null, fallback: T): T => {
  try {
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

export const progressKey = (course: CourseConfig, topicId: string) => `${course.id}.progress.${topicId}`
export const answersKey = (course: CourseConfig, topicId: string) => `${course.id}.answers.${topicId}`

export const loadProgress = (course: CourseConfig, topicId: string) => {
  const value = Number(localStorage.getItem(progressKey(course, topicId)))
  return Number.isInteger(value) && value >= 1 && value <= 85 ? value : 1
}

export const saveProgress = (course: CourseConfig, topicId: string, slide: number) => {
  localStorage.setItem(progressKey(course, topicId), String(Math.min(85, Math.max(1, slide))))
}

export const loadAnswers = (course: CourseConfig, topicId: string) =>
  safeParse<TestAnswers>(localStorage.getItem(answersKey(course, topicId)), {})

export const saveAnswers = (course: CourseConfig, topicId: string, answers: TestAnswers) => {
  localStorage.setItem(answersKey(course, topicId), JSON.stringify(answers))
}

export const clearResults = (course: CourseConfig, topicId: string) => {
  localStorage.removeItem(answersKey(course, topicId))
}
