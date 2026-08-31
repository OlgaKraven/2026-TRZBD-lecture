import { BookOpen, ExternalLink, Moon, Search, Sun, UserRoundPen } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { CourseConfig, LectureTopic, TeacherProfile } from '../types'

type Props = {
  course: CourseConfig
  topics: LectureTopic[]
  profile: TeacherProfile
  theme: 'light' | 'dark'
  onThemeChange: (theme: 'light' | 'dark') => void
  onOpenTopic: (topic: LectureTopic) => void
  onEditProfile: (returnFocus: HTMLElement | null) => void
  warning?: string
}
export function Catalog({ course, topics, profile, theme, onThemeChange, onOpenTopic, onEditProfile, warning }: Props) {
  const [search, setSearch] = useState('')
  const [semester, setSemester] = useState<number | 'all'>('all')
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ru-RU')
    return topics.filter((topic) => {
      const semesterMatch = semester === 'all' || topic.semester === semester
      const textMatch = !query || `${topic.displayTitle} ${topic.sourceTitle}`.toLocaleLowerCase('ru-RU').includes(query)
      return semesterMatch && textMatch
    })
  }, [search, semester, topics])

  const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

  return (
    <main className="catalog">
      <header className="catalog-header">
        <a className="brand-lockup" href={import.meta.env.BASE_URL} aria-label="Каталог курса">
          <img src={asset('brand/synergy-logo.png')} alt="Фирменный знак" />
          <span><strong>МДК.11.01</strong><small>Технология разработки и защиты баз данных</small></span>
        </a>
        <nav aria-label="Действия каталога">
          <button className="button ghost" type="button" ref={profileButtonRef} onClick={() => onEditProfile(profileButtonRef.current)}>
            <UserRoundPen size={18} /> Данные преподавателя
          </button>
          <button className="icon-button" type="button" onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </nav>
      </header>

      {warning && <div className="notice" role="status">{warning}</div>}

      <section className="catalog-hero">
        <div className="hero-copy">
          <p className="eyebrow">{course.course} курс · {course.semesters.length === 1 ? `${course.semesters[0]} семестр` : '7–8 семестры'}</p>
          <h1>Разработка и защита <span>баз данных</span></h1>
          <p className="hero-lead">{course.realisticCase}</p>
          <div className="teacher-summary">
            <span>Преподаватель</span>
            <strong>{profile.fullName || 'Данные можно заполнить перед занятием'}</strong>
            {profile.position && <small>{profile.position}</small>}
            {profile.organizationUnit && <small>{profile.organizationUnit}</small>}
          </div>
        </div>
        <div className="hero-mascot">
          <div className="chevron-backdrop" />
          <img src={asset('brand/mascot/trzbd-database-rhino-catalog.png')} alt="Носорог-проектировщик и защитник базы данных" />
        </div>
      </section>

      <section className="catalog-tools" aria-label="Поиск и фильтры">
        <label className="search-field">
          <Search size={19} aria-hidden="true" />
          <span className="sr-only">Поиск по темам</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по темам" />
        </label>
        <div className="semester-filter" aria-label="Фильтр по семестру">
          <button type="button" className={semester === 'all' ? 'active' : ''} onClick={() => setSemester('all')}>Все темы</button>
          {course.semesters.map((item) => (
            <button key={item} type="button" className={semester === item ? 'active' : ''} onClick={() => setSemester(item)}>{item} семестр</button>
          ))}
        </div>
        <a className="materials-link" href={course.materialsUrl} target="_blank" rel="noreferrer"><BookOpen size={18} /> Материалы <ExternalLink size={15} /></a>
      </section>

      <section className="topic-grid" aria-label="Лекционные темы">
        {filtered.map((topic) => (
          <article className={`topic-card semester-${topic.semester}`} key={topic.id}>
            <div className="topic-card-top">
              <span className="topic-index">{String(topics.indexOf(topic) + 1).padStart(2, '0')}</span>
              <span className="semester-tag">{topic.semester} семестр</span>
            </div>
            <h2>{topic.displayTitle}</h2>
            <p>{topic.sourceTitle}</p>
            <div className="topic-card-footer">
              <span>{topic.lectureHours} ч · {topic.competencies.join(' · ')}</span>
              <button className="button primary" type="button" onClick={() => onOpenTopic(topic)}>Открыть</button>
            </div>
          </article>
        ))}
      </section>

      {filtered.length === 0 && <section className="empty-state" role="status"><h2>Темы не найдены</h2><p>Измените запрос или выберите другой семестр.</p></section>}

      <footer className="catalog-footer">
        <span>MySQL 8.4 — основная учебная платформа</span>
        <span>{course.module}</span>
        <a href={course.repository} target="_blank" rel="noreferrer">GitHub-репозиторий <ExternalLink size={14} /></a>
      </footer>
    </main>
  )
}
