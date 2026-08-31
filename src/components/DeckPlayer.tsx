import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Expand,
  FileDown,
  Gauge,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sun,
  UserRoundPen,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CourseConfig, LectureTopic, Slide, TeacherProfile, TestAnswers } from '../types'
import { clearResults, loadAnswers, saveAnswers, saveProgress } from '../lib/storage'
import { SlideFrame } from './SlideFrame'

type Props = {
  course: CourseConfig
  topic: LectureTopic
  deck: Slide[]
  profile: TeacherProfile
  initialSlide: number
  theme: 'light' | 'dark'
  onThemeChange: (theme: 'light' | 'dark') => void
  onEditProfile: (returnFocus: HTMLElement | null) => void
}

export function DeckPlayer({ course, topic, deck, profile, initialSlide, theme, onThemeChange, onEditProfile }: Props) {
  const reducedMotion = useReducedMotion()
  const [slideNumber, setSlideNumber] = useState(initialSlide)
  const [animations, setAnimations] = useState(() => localStorage.getItem(`${course.id}.animations`) !== 'off')
  const [replayKey, setReplayKey] = useState(0)
  const [answers, setAnswers] = useState<TestAnswers>(() => loadAnswers(course, topic.id))
  const [tocOpen, setTocOpen] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)
  const tocDialogRef = useRef<HTMLDialogElement>(null)
  const resultDialogRef = useRef<HTMLDialogElement>(null)
  const tocButtonRef = useRef<HTMLButtonElement>(null)
  const resultButtonRef = useRef<HTMLButtonElement>(null)
  const profileButtonRef = useRef<HTMLButtonElement>(null)

  const current = deck[slideNumber - 1]
  const previous = deck[slideNumber - 2]
  const next = deck[slideNumber]
  const motionEnabled = animations && !reducedMotion
  const percent = Math.round((slideNumber / deck.length) * 100)

  const setSlide = useCallback((value: number) => {
    const safe = Math.max(1, Math.min(deck.length, value))
    setSlideNumber(safe)
    saveProgress(course, topic.id, safe)
    const url = new URL(window.location.href)
    url.searchParams.set('topic', topic.id)
    url.searchParams.set('slide', String(safe))
    window.history.replaceState({}, '', url)
  }, [course, deck.length, topic.id])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName) || tocOpen || resultOpen) return
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault()
        setSlide(slideNumber + 1)
      }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault()
        setSlide(slideNumber - 1)
      }
      if (event.key === 'Home') setSlide(1)
      if (event.key === 'End') setSlide(deck.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deck.length, resultOpen, setSlide, slideNumber, tocOpen])

  useEffect(() => {
    const dialog = tocDialogRef.current
    if (!dialog) return
    if (tocOpen && !dialog.open) dialog.showModal()
    if (!tocOpen && dialog.open) dialog.close()
  }, [tocOpen])

  useEffect(() => {
    const dialog = resultDialogRef.current
    if (!dialog) return
    if (resultOpen && !dialog.open) dialog.showModal()
    if (!resultOpen && dialog.open) dialog.close()
  }, [resultOpen])

  const updateAnswers = (testId: string, value: string | number[]) => {
    const nextAnswers = { ...answers, [testId]: value }
    setAnswers(nextAnswers)
    saveAnswers(course, topic.id, nextAnswers)
  }

  const tests = useMemo(() => deck.filter((slide) => slide.test).map((slide) => slide.test!), [deck])
  const scoredTests = tests.filter((test) => test.mode !== 'short')
  const score = scoredTests.filter((test) => {
    const answer = answers[test.id]
    if (!Array.isArray(answer) || !test.correctIndexes) return false
    return answer.length === test.correctIndexes.length && [...answer].sort().every((value, index) => value === [...test.correctIndexes!].sort()[index])
  }).length

  const closeToc = () => {
    setTocOpen(false)
    queueMicrotask(() => tocButtonRef.current?.focus())
  }
  const closeResult = () => {
    setResultOpen(false)
    queueMicrotask(() => resultButtonRef.current?.focus())
  }
  const toggleAnimations = () => {
    const nextValue = !animations
    setAnimations(nextValue)
    localStorage.setItem(`${course.id}.animations`, nextValue ? 'on' : 'off')
  }
  const printForTeacher = () => {
    const url = new URL(`${import.meta.env.BASE_URL}print`, window.location.origin)
    url.searchParams.set('topic', topic.id)
    url.searchParams.set('variant', 'teacher')
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  const goCatalog = () => {
    window.location.assign(import.meta.env.BASE_URL)
  }
  const fullScreen = async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
    else await document.exitFullscreen()
  }

  return (
    <main className="deck-shell">
      <div className="deck-toolbar">
        <button className="button ghost" type="button" onClick={goCatalog}><ArrowLeft size={18} /> Каталог</button>
        <div className="deck-topic">
          <strong>{topic.displayTitle}</strong>
          <span>{topic.semester} семестр</span>
        </div>
        <div className="toolbar-actions">
          <button className="icon-button" type="button" ref={tocButtonRef} onClick={() => setTocOpen(true)} aria-label="Открыть содержание"><BookOpenText size={19} /></button>
          <button className="icon-button" type="button" ref={resultButtonRef} onClick={() => setResultOpen(true)} aria-label="Открыть результаты"><Gauge size={19} /></button>
          <button className="icon-button" type="button" ref={profileButtonRef} onClick={() => onEditProfile(profileButtonRef.current)} aria-label="Данные преподавателя"><UserRoundPen size={19} /></button>
          <button className="icon-button" type="button" onClick={toggleAnimations} aria-label={animations ? 'Выключить анимацию' : 'Включить анимацию'}>{animations ? <Pause size={19} /> : <Play size={19} />}</button>
          <button className="icon-button" type="button" onClick={() => setReplayKey((key) => key + 1)} aria-label="Повторить анимацию"><RotateCcw size={19} /></button>
          <button className="icon-button" type="button" onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}>{theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}</button>
          <button className="icon-button" type="button" onClick={fullScreen} aria-label="Полноэкранный режим"><Expand size={19} /></button>
        </div>
      </div>

      <div className="progress-track" aria-label={`Прогресс ${percent}%`}><span style={{ width: `${percent}%` }} /></div>

      <section className="player-stage">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${slideNumber}-${replayKey}`}
            className="active-slide"
            initial={motionEnabled ? { opacity: 0, x: 28 } : false}
            animate={{ opacity: 1, x: 0 }}
            exit={motionEnabled ? { opacity: 0, x: -20 } : undefined}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <SlideFrame slide={current} course={course} topic={topic} profile={profile} answers={answers} onAnswer={updateAnswers} />
          </motion.div>
        </AnimatePresence>
        <div className="adjacent-slides" aria-hidden="true">
          {previous && <SlideFrame slide={previous} course={course} topic={topic} profile={profile} compact />}
          {next && <SlideFrame slide={next} course={course} topic={topic} profile={profile} compact />}
        </div>
      </section>

      <div className="deck-controls">
        <button className="button secondary" type="button" disabled={slideNumber === 1} onClick={() => setSlide(slideNumber - 1)}><ArrowLeft size={18} /> Назад</button>
        <button className="slide-counter" type="button" onClick={() => setTocOpen(true)} aria-label="Открыть содержание">{slideNumber} / {deck.length}</button>
        <div className="print-actions">
          <button className="button ghost" type="button" onClick={printForTeacher}><FileDown size={17} /> Печать для преподавателя</button>
        </div>
        <button className="button primary" type="button" disabled={slideNumber === deck.length} onClick={() => setSlide(slideNumber + 1)}>Вперёд <ArrowRight size={18} /></button>
      </div>

      <dialog ref={tocDialogRef} className="toc-dialog" onCancel={(event) => { event.preventDefault(); closeToc() }} onClose={() => setTocOpen(false)} aria-labelledby="toc-title">
        <div className="dialog-heading">
          <div><p className="eyebrow">Навигация</p><h2 id="toc-title">Содержание темы</h2></div>
          <button className="icon-button" type="button" onClick={closeToc} aria-label="Закрыть содержание">×</button>
        </div>
        <nav className="toc-list" aria-label="Экраны темы">
          {deck.map((slide) => (
            <button key={slide.number} type="button" className={slide.number === slideNumber ? 'active' : ''} onClick={() => { setSlide(slide.number); closeToc() }}>
              <span>{String(slide.number).padStart(2, '0')}</span><strong>{slide.title}</strong>
            </button>
          ))}
        </nav>
      </dialog>

      <dialog ref={resultDialogRef} className="result-dialog" onCancel={(event) => { event.preventDefault(); closeResult() }} onClose={() => setResultOpen(false)} aria-labelledby="result-title">
        <div className="dialog-heading">
          <div><p className="eyebrow">Самопроверка</p><h2 id="result-title">Результат</h2></div>
          <button className="icon-button" type="button" onClick={closeResult} aria-label="Закрыть результаты">×</button>
        </div>
        <div className="score-card"><strong>{score} / {scoredTests.length}</strong><span>автоматически проверяемых заданий</span></div>
        <p>Короткий ответ оценивается по критериям вручную: backend интеллектуальной проверки не подключён.</p>
        <div className="result-list">
          {tests.map((test) => <div key={test.id}><strong>{test.mode}</strong><span>{answers[test.id] === undefined ? 'Нет ответа' : 'Ответ сохранён'}</span><p>{test.explanation}</p></div>)}
        </div>
        <div className="dialog-actions">
          <button className="button secondary" type="button" onClick={() => { clearResults(course, topic.id); setAnswers({}) }}>Сбросить результаты</button>
          <button className="button primary" type="button" onClick={closeResult}>Вернуться к теме</button>
        </div>
      </dialog>
    </main>
  )
}
