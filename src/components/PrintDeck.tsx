import { useEffect } from 'react'
import type { CourseConfig, LectureTopic, Slide, TeacherProfile } from '../types'
import { SlideFrame } from './SlideFrame'

type Props = {
  course: CourseConfig
  topic: LectureTopic
  deck: Slide[]
  profile: TeacherProfile
  variant: 'student' | 'teacher'
}
export function PrintDeck({ course, topic, deck, profile, variant }: Props) {
  useEffect(() => {
    let cancelled = false
    const ready = async () => {
      await document.fonts.ready
      await Promise.all(
        Array.from(document.images).map((image) =>
          image.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                image.addEventListener('load', () => resolve(), { once: true })
                image.addEventListener('error', () => resolve(), { once: true })
              }),
        ),
      )
      if (!cancelled) document.body.dataset.printReady = 'true'
    }
    ready()
    return () => {
      cancelled = true
      delete document.body.dataset.printReady
    }
  }, [])

  return (
    <main className="print-deck" data-topic={topic.id} data-variant={variant}>
      {deck.map((slide) => (
        <section className="print-page" key={slide.number}>
          <SlideFrame slide={slide} course={course} topic={topic} profile={profile} printVariant={variant} />
        </section>
      ))}
    </main>
  )
}
