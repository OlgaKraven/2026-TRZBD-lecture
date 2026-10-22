import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Download, ExternalLink, LayoutGrid, List, Moon, Search, Sun, X } from 'lucide-react'
import QRCode from 'qrcode'
import type { CatalogProps } from './learning'
import './course-catalog.css'

type View = 'cards' | 'list'
type Filters = { search: string; semester: string }

function readSaved(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) || 'null') }
  catch { return null }
}

function normalize(value: string) {
  return value.toLocaleLowerCase('ru').replace(/ё/g, 'е').trim()
}

function topicCount(count: number) {
  const last = count % 10, lastTwo = count % 100
  return `${count} ${last === 1 && lastTwo !== 11 ? 'тема' : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'темы' : 'тем'}`
}

function materialsURL(value: string): string | null {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch { return null }
}

export function CourseCatalog({
  course, base, profile, materials, theme, storagePrefix, invalidLecture,
  onOpenLecture, onPrint, onProfileChange, onMaterialsChange, onThemeChange,
}: CatalogProps) {
  const [view, setView] = useState<View>(() => readSaved(`${storagePrefix}:catalog:view`) === 'list' ? 'list' : 'cards')
  const [filters, setFilters] = useState<Filters>(() => {
    const saved = readSaved(`${storagePrefix}:catalog:filters`) as Partial<Filters> | null
    return {
      search: typeof saved?.search === 'string' ? saved.search.slice(0, 200) : '',
      semester: saved?.semester === 'all' || course.semesters.some(semester => String(semester) === saved?.semester) ? saved!.semester! : 'all',
    }
  })
  const [storageError, setStorageError] = useState(false)
  const [materialsOpen, setMaterialsOpen] = useState(false)
  const [materialsDraft, setMaterialsDraft] = useState(materials)
  const [appliedURL, setAppliedURL] = useState<string | null>(null)
  const [qrImage, setQrImage] = useState('')
  const [qrStatus, setQrStatus] = useState('')
  const [materialsError, setMaterialsError] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const teacherRef = useRef<HTMLDetailsElement>(null)
  const teacherSummaryRef = useRef<HTMLElement>(null)
  const materialsButtonRef = useRef<HTMLButtonElement>(null)
  const materialsDialogRef = useRef<HTMLDialogElement>(null)
  const materialsInputRef = useRef<HTMLInputElement>(null)
  const qrRequest = useRef(0)

  useEffect(() => {
    try {
      localStorage.setItem(`${storagePrefix}:catalog:view`, JSON.stringify(view))
      localStorage.setItem(`${storagePrefix}:catalog:filters`, JSON.stringify(filters))
      setStorageError(false)
    } catch { setStorageError(true) }
  }, [view, filters, storagePrefix])

  useEffect(() => {
    if (materialsOpen && materialsDialogRef.current && !materialsDialogRef.current.open) materialsDialogRef.current.showModal()
  }, [materialsOpen])

  useEffect(() => () => { qrRequest.current += 1 }, [])

  const asset = (path: string) => `${base.endsWith('/') ? base : `${base}/`}${path.replace(/^\//, '')}`
  const query = normalize(filters.search)
  const visibleLectures = course.lectures.filter((lecture, index) =>
    (filters.semester === 'all' || String(lecture.semester) === filters.semester) &&
    (!query || normalize(`${lecture.title} тема ${index + 1}`).includes(query)),
  )

  function closeTeacher() {
    if (teacherRef.current) teacherRef.current.open = false
    teacherSummaryRef.current?.focus()
  }

  async function generateQR(url: string) {
    const request = ++qrRequest.current
    setQrImage('')
    setMaterialsError('')
    setQrStatus('Формирование QR-кода…')
    try {
      const image = await QRCode.toDataURL(url, { width: 220, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } })
      if (request !== qrRequest.current) return
      setQrImage(image)
      setQrStatus('')
    } catch {
      if (request !== qrRequest.current) return
      setQrStatus('')
      setMaterialsError('Не удалось сформировать QR-код. Материалы можно открыть по ссылке.')
    }
  }

  function openMaterials() {
    if (teacherRef.current) teacherRef.current.open = false
    const url = materialsURL(materials)
    setMaterialsDraft(materials)
    setAppliedURL(url)
    setMaterialsOpen(true)
    if (url) void generateQR(url)
    else {
      setQrImage('')
      setQrStatus('')
      setMaterialsError('Введите полную ссылку, начинающуюся с https:// или http://.')
    }
  }

  function editMaterials(value: string) {
    qrRequest.current += 1
    setMaterialsDraft(value)
    setAppliedURL(null)
    setQrImage('')
    const valid = materialsURL(value)
    setMaterialsError(valid ? '' : 'Введите полную ссылку, начинающуюся с https:// или http://.')
    setQrStatus(valid ? 'Обновите QR-код для новой ссылки.' : '')
  }

  function updateMaterials() {
    const url = materialsURL(materialsDraft)
    if (!url) {
      setMaterialsError('Введите полную ссылку, начинающуюся с https:// или http://.')
      materialsInputRef.current?.focus()
      return
    }
    onMaterialsChange(url)
    setMaterialsDraft(url)
    setAppliedURL(url)
    void generateQR(url)
  }

  function closeMaterials() {
    qrRequest.current += 1
    setMaterialsOpen(false)
    materialsButtonRef.current?.focus()
  }

  return <div className="ok-page" data-layout={view} data-theme={theme} aria-label="Каталог лекций">
    <header className="ok-header">
      <a className="ok-brand" href="#ok-top" aria-label="ТРЗБД — каталог лекций">
        <img className="ok-logo" src={asset('brand/synergy-mark.png')} alt="" />
        <span>{course.code}<span className="ok-brand-sub">ТРЗБД</span></span>
      </a>
      <nav className="ok-header-actions" aria-label="Навигация курса">
        <a className="ok-nav-active" href="#ok-catalog">Лекции</a>
        <button ref={materialsButtonRef} className="ok-materials" type="button" aria-label="Материалы — QR-код и ссылка" onClick={openMaterials}>Материалы</button>
        <details className="ok-teacher" ref={teacherRef} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); closeTeacher() } }}>
          <summary ref={teacherSummaryRef} aria-label="Преподавателю — настройки">Преподавателю</summary>
          <div className="ok-teacher-menu">
            <div className="ok-teacher-fields">
              <label>ФИО<input type="text" autoComplete="name" placeholder="Введите ФИО" aria-label="ФИО преподавателя" value={profile.fullName} onChange={event => onProfileChange({ ...profile, fullName: event.target.value })} /></label>
              <label>Должность<input type="text" autoComplete="organization-title" placeholder="Укажите должность" aria-label="Должность преподавателя" value={profile.position} onChange={event => onProfileChange({ ...profile, position: event.target.value })} /></label>
              <label>Кафедра<input type="text" autoComplete="off" placeholder="Укажите кафедру" aria-label="Кафедра преподавателя" value={profile.department} onChange={event => onProfileChange({ ...profile, department: event.target.value })} /></label>
            </div>
            <div className="ok-export-settings">
              <h3>Скачать лекции в PDF</h3>
              <div className="ok-export-actions">{course.semesters.map(semester => <button className="ok-button" type="button" key={semester} aria-label={`${semester} семестр — скачать PDF`} onClick={() => { closeTeacher(); onPrint(`semester-${semester}`) }}><Download aria-hidden="true" />{semester} семестр</button>)}</div>
            </div>
            <div className="ok-teacher-footer"><button className="ok-button" type="button" onClick={closeTeacher}>Готово</button></div>
          </div>
        </details>
        <button className="ok-theme" type="button" aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'} title={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'} onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}</button>
      </nav>
    </header>
    <main id="ok-top">
      <section className="ok-hero" aria-label="Обложка курса">
        <div className="ok-hero-copy">
          <div className="ok-eyebrow">{course.code}<span>{course.semesters.join('–')} семестры</span></div>
          <h1>{course.discipline}</h1>
        </div>
        <img className="ok-rhino" src={asset(course.mascot)} alt={course.mascotAlt} />
      </section>
      <section className="ok-catalog" id="ok-catalog" aria-label="Темы курса">
        {invalidLecture && <p className="ok-notice" role="status">Лекция не найдена. Выберите тему в каталоге.</p>}
        {storageError && <p className="ok-notice" role="status">Не удалось сохранить вид и фильтры в этом браузере.</p>}
        <div className="ok-catalog-heading"><h2>Лекции</h2><span className="ok-count" aria-live="polite">{topicCount(visibleLectures.length)}</span></div>
        <div className="ok-tools">
          <div className="ok-search-layout">
            <label className="ok-search"><Search aria-hidden="true" /><input ref={searchRef} type="search" placeholder="Найти тему" aria-label="Поиск по темам курса" value={filters.search} maxLength={200} onChange={event => setFilters({ ...filters, search: event.target.value })} /></label>
            <div className="ok-layout-buttons" role="group" aria-label="Вид каталога">
              <button type="button" aria-label="Вид: карточки" title="Карточки" aria-pressed={view === 'cards'} data-view="cards" data-tooltip="Карточки" onClick={() => setView('cards')}><LayoutGrid aria-hidden="true" /></button>
              <button type="button" aria-label="Вид: список" title="Список" aria-pressed={view === 'list'} data-view="list" data-tooltip="Список" onClick={() => setView('list')}><List aria-hidden="true" /></button>
            </div>
          </div>
          <div className="ok-filters" role="group" aria-label="Фильтр по семестру">
            <button type="button" aria-pressed={filters.semester === 'all'} data-semester="all" onClick={() => setFilters({ ...filters, semester: 'all' })}>Все темы</button>
            {course.semesters.map(semester => <button type="button" key={semester} aria-pressed={filters.semester === String(semester)} data-semester={semester} onClick={() => setFilters({ ...filters, semester: String(semester) })}>{semester} семестр</button>)}
          </div>
        </div>
        <div className="ok-topics" hidden={!visibleLectures.length}>{visibleLectures.map(lecture => <article className="ok-topic" key={lecture.id} data-topic={lecture.id} data-semester={lecture.semester}>
          <div className="ok-topic-meta"><span className="ok-topic-code">ТЕМА {String(course.lectures.indexOf(lecture) + 1).padStart(2, '0')}</span><span>{lecture.semester} семестр</span></div>
          <div className="ok-topic-copy"><h3>{lecture.title}</h3></div>
          <div className="ok-topic-actions">
            <button className="ok-open" type="button" aria-label={`Открыть лекцию: ${lecture.title}`} onClick={() => onOpenLecture(lecture)}>Открыть лекцию<ArrowUpRight aria-hidden="true" /></button>
            <button className="ok-pdf" type="button" aria-label={`Скачать PDF: ${lecture.title}`} onClick={() => onPrint(lecture.id)}><Download aria-hidden="true" />Скачать PDF</button>
          </div>
        </article>)}</div>
        <div className="ok-empty" hidden={!!visibleLectures.length}><h3>Темы не найдены</h3><p>Попробуйте другое слово или выберите все темы.</p><button className="ok-button" type="button" onClick={() => { setFilters({ search: '', semester: 'all' }); searchRef.current?.focus() }}>Сбросить поиск</button></div>
      </section>
    </main>

    <dialog className="ok-materials-dialog" ref={materialsDialogRef} aria-labelledby="ok-materials-heading" onClose={closeMaterials}>
      <button className="ok-close" type="button" aria-label="Закрыть материалы" onClick={() => materialsDialogRef.current?.close()}><X aria-hidden="true" /></button>
      <h2 id="ok-materials-heading">Материалы</h2>
      <p className="ok-materials-folder">Папка с материалами курса</p>
      <div className="ok-materials-qr-frame" hidden={!qrImage}>{qrImage && <img className="ok-materials-qr-image" src={qrImage} width={220} height={220} alt="QR-код для открытия материалов" />}</div>
      <p className="ok-materials-status" role="status" aria-live="polite" hidden={!qrStatus}>{qrStatus}</p>
      <form className="ok-materials-form" onSubmit={event => { event.preventDefault(); updateMaterials() }}>
        <label>Ссылка на материалы<input ref={materialsInputRef} type="url" autoComplete="off" inputMode="url" spellCheck={false} placeholder="https://…" aria-label="Ссылка на материалы" aria-invalid={materialsError && !materialsURL(materialsDraft) ? true : undefined} aria-describedby={materialsError ? 'ok-materials-error' : undefined} value={materialsDraft} onChange={event => editMaterials(event.target.value)} /></label>
        <p className="ok-materials-error" id="ok-materials-error" role="alert" hidden={!materialsError}>{materialsError}</p>
        <button className="ok-button" type="submit">Обновить QR-код</button>
      </form>
      {appliedURL && <a className="ok-materials-open" href={appliedURL} target="_blank" rel="noopener noreferrer" aria-label="Открыть материалы — в новой вкладке">Открыть материалы<ExternalLink aria-hidden="true" /></a>}
    </dialog>
  </div>
}
