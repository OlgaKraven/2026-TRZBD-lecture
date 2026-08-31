import { useEffect, useRef, useState } from 'react'
import { Catalog } from './components/Catalog'
import { DeckPlayer } from './components/DeckPlayer'
import { PrintDeck } from './components/PrintDeck'
import { TeacherProfileDialog } from './components/TeacherProfileDialog'
import { course, topics } from './data/courseData'
import { buildDeck } from './deck/buildDeck'
import { loadProgress } from './lib/storage'
import { loadTeacherProfile } from './lib/teacherProfile'
import type { TeacherProfile } from './types'

const readLocation = () => ({
  href: window.location.href,
  pathname: window.location.pathname,
  params: new URLSearchParams(window.location.search),
})

function App() {
  const [locationState, setLocationState] = useState(readLocation)
  const [profile, setProfile] = useState<TeacherProfile>(() => loadTeacherProfile(course))
  const [profileOpen, setProfileOpen] = useState(false)
  const profileReturnRef = useRef<HTMLElement | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem(`${course.id}.theme`) === 'dark' ? 'dark' : 'light'))

  useEffect(() => {
    const onPopState = () => setLocationState(readLocation())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(`${course.id}.theme`, theme)
  }, [theme])

  const topicId = locationState.params.get('topic')
  const topic = topicId ? topics.find((item) => item.id === topicId) : undefined
  const rawSlide = Number(locationState.params.get('slide') || '1')
  const initialSlide = Number.isInteger(rawSlide) && rawSlide >= 1 && rawSlide <= 85 ? rawSlide : 1
  const isPrint = locationState.pathname.replace(/\/+$/, '').endsWith('/print')
  const variant = locationState.params.get('variant') === 'teacher' ? 'teacher' : 'student'
  const warning = topicId && !topic ? `Тема «${topicId}» не найдена. Открыт каталог курса.` : rawSlide !== initialSlide ? 'Некорректный номер экрана заменён на 1.' : undefined

  useEffect(() => {
    document.title = topic
      ? `${topic.displayTitle} — МДК.11.01`
      : `МДК.11.01 — ${course.course} курс`
  }, [topic])

  const editProfile = (returnFocus: HTMLElement | null) => {
    profileReturnRef.current = returnFocus
    setProfileOpen(true)
  }

  if (isPrint) {
    if (!topic) {
      return <main className="route-error"><h1>Тема для печати не найдена</h1><p>Проверьте параметр topic в адресе.</p></main>
    }
    return <PrintDeck course={course} topic={topic} deck={buildDeck(topic, course)} profile={profile} variant={variant} />
  }

  const openTopic = (selected: (typeof topics)[number]) => {
    const slide = loadProgress(course, selected.id)
    const url = new URL(window.location.href)
    url.pathname = import.meta.env.BASE_URL
    url.search = ''
    url.searchParams.set('topic', selected.id)
    url.searchParams.set('slide', String(slide))
    window.history.pushState({}, '', url)
    setLocationState(readLocation())
  }

  return (
    <>
      {topic ? (
        <DeckPlayer
          key={topic.id + '-' + initialSlide}
          course={course}
          topic={topic}
          deck={buildDeck(topic, course)}
          profile={profile}
          initialSlide={initialSlide}
          theme={theme}
          onThemeChange={setTheme}
          onEditProfile={editProfile}
        />
      ) : (
        <Catalog
          course={course}
          topics={topics}
          profile={profile}
          theme={theme}
          onThemeChange={setTheme}
          onOpenTopic={openTopic}
          onEditProfile={editProfile}
          warning={warning}
        />
      )}
      <TeacherProfileDialog
        key={Object.values(profile).join('|')}
        course={course}
        profile={profile}
        onChange={setProfile}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        returnFocusRef={profileReturnRef}
      />
    </>
  )
}

export default App
