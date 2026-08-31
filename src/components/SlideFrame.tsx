import { ExternalLink } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { getSource } from '../data/sourceRegistry'
import type { CourseConfig, LectureTopic, Slide, TeacherProfile, TestAnswers } from '../types'

type Props = {
  slide: Slide
  course: CourseConfig
  topic: LectureTopic
  profile: TeacherProfile
  answers?: TestAnswers
  onAnswer?: (testId: string, value: string | number[]) => void
  printVariant?: 'student' | 'teacher'
  compact?: boolean
}

const profileLines = (profile: TeacherProfile) =>
  [profile.fullName, profile.position, profile.organizationUnit].filter(Boolean)

export function SlideFrame({ slide, course, topic, profile, answers = {}, onAnswer, printVariant, compact = false }: Props) {
  const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`
  const isPrint = Boolean(printVariant)
  const showTeacherNotes = printVariant === 'teacher'
  const testAnswer = slide.test ? answers[slide.test.id] : undefined
  const sourceLinks = slide.sourceIds.map(getSource).filter((source) => Boolean(source))
  const showProfile = ['title', 'divider', 'questions'].includes(slide.kind)
  const showMascot = ['title', 'questions', 'example'].includes(slide.kind)

  const changeChoice = (event: ChangeEvent<HTMLInputElement>, index: number, multiple: boolean) => {
    if (!slide.test || !onAnswer) return
    if (!multiple) {
      onAnswer(slide.test.id, [index])
      return
    }
    const current = Array.isArray(testAnswer) ? testAnswer : []
    onAnswer(slide.test.id, event.target.checked ? [...new Set([...current, index])] : current.filter((item) => item !== index))
  }

  return (
    <article className={`slide-frame kind-${slide.kind} ${compact ? 'compact' : ''}`} aria-label={`Экран ${slide.number}: ${slide.title}`}>
      <img className="side-ornament" src={asset('brand/side-ornament.png')} alt="" aria-hidden="true" />
      <header className="slide-header">
        <div className="slide-brand">
          <img src={asset('brand/synergy-logo.png')} alt="" aria-hidden="true" />
          <span>МДК.11.01 · {course.course} курс · {topic.semester} семестр</span>
        </div>
        <span className="slide-number">{String(slide.number).padStart(2, '0')}</span>
      </header>

      <div className="slide-content">
        <div className="slide-copy">
          <p className="slide-kicker">{slide.kicker}</p>
          <h2>{slide.title}</h2>
          {slide.body && <p className="slide-body-copy">{slide.body}</p>}

          {slide.number === 5 && (
            <div className="materials-panel">
              <img src={asset('qr/trzbd-materials.png')} alt="QR-код: материалы МДК.11.01" />
              <a href={course.materialsUrl} target="_blank" rel="noreferrer">{course.materialsUrl} <ExternalLink size={16} /></a>
            </div>
          )}

          {slide.bullets && (
            <ul className={slide.number === 3 || slide.number === 4 ? 'bibliography-list' : ''}>
              {slide.bullets.map((bullet, index) => <li key={`${slide.number}-${index}`}>{bullet}</li>)}
            </ul>
          )}

          {slide.code && (
            <div className="code-block">
              <span>{slide.codeLabel || 'Пример'}</span>
              <pre><code>{slide.code}</code></pre>
            </div>
          )}

          {slide.links && slide.number !== 5 && (
            <div className="slide-links">
              {slide.links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label} <ExternalLink size={14} /></a>)}
            </div>
          )}

          {slide.test && (
            <section className="test-task" aria-labelledby={`test-${slide.test.id}`}>
              <h3 id={`test-${slide.test.id}`}>{slide.test.prompt}</h3>
              {slide.test.options && slide.test.mode !== 'order' && (
                <div className="test-options">
                  {slide.test.options.map((option, index) => {
                    const multiple = slide.test?.mode === 'multiple'
                    const checked = Array.isArray(testAnswer) && testAnswer.includes(index)
                    return (
                      <label key={option}>
                        <input
                          type={multiple ? 'checkbox' : 'radio'}
                          name={slide.test?.id}
                          checked={checked}
                          disabled={isPrint}
                          onChange={(event) => changeChoice(event, index, multiple)}
                        />
                        <span>{option}</span>
                      </label>
                    )
                  })}
                </div>
              )}
              {slide.test.mode === 'order' && (
                <div className="order-task">
                  <ol>{slide.test.options?.map((option) => <li key={option}>{option.replace(/^\d+\.\s*/, '')}</li>)}</ol>
                  {!isPrint && <label>Твоя последовательность<input value={typeof testAnswer === 'string' ? testAnswer : ''} onChange={(event) => onAnswer?.(slide.test!.id, event.target.value)} placeholder="Например: 1 → 2 → 3 → 4" /></label>}
                </div>
              )}
              {slide.test.mode === 'short' && !isPrint && (
                <label className="short-answer">Твой ответ<textarea value={typeof testAnswer === 'string' ? testAnswer : ''} onChange={(event) => onAnswer?.(slide.test!.id, event.target.value)} /></label>
              )}
              <details className="test-hint" open={showTeacherNotes}>
                <summary>Подсказка</summary>
                <p>{slide.test.hint}</p>
              </details>
              {showTeacherNotes && (
                <div className="teacher-answer">
                  <strong>Правильный ответ</strong>
                  <p>{slide.test.correctAnswer}</p>
                  <strong>Пояснение</strong>
                  <p>{slide.test.explanation}</p>
                  <strong>Критерии проверки</strong>
                  <p>{slide.test.criteria}</p>
                </div>
              )}
            </section>
          )}
        </div>

        {slide.kind === 'divider' && <img className="divider-arrow" src={asset('brand/divider-arrow-light.png')} alt="" aria-hidden="true" />}
        {showMascot && (
          <div className="mascot-mask" aria-hidden="true">
            <img src={asset(isPrint ? 'brand/mascot/trzbd-database-rhino-pdf.png' : 'brand/mascot/trzbd-database-rhino.webp')} alt="" />
          </div>
        )}
      </div>

      <footer className="slide-footer">
        <div className="profile-lines">
          {showProfile && profileLines(profile).map((line) => <span key={line}>{line}</span>)}
        </div>
        <div className="source-links" aria-label="Источники экрана">
          {sourceLinks.map((source) => source && (
            <a key={source.id} href={source.location.startsWith('http') ? source.location : undefined} title={source.title}>
              {source.id}
            </a>
          ))}
        </div>
      </footer>
    </article>
  )
}
