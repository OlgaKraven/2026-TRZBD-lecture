import { useEffect, useRef, useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import type { CourseConfig, TeacherProfile } from '../types'
import { clearTeacherProfile, saveTeacherProfile } from '../lib/teacherProfile'

type Props = {
  course: CourseConfig
  profile: TeacherProfile
  onChange: (profile: TeacherProfile) => void
  open: boolean
  onClose: () => void
  returnFocusRef?: RefObject<HTMLElement | null>
}

export function TeacherProfileDialog({ course, profile, onChange, open, onClose, returnFocusRef }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState(profile)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const close = () => {
    onClose()
    queueMicrotask(() => returnFocusRef?.current?.focus())
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const normalized = saveTeacherProfile(course, draft)
    onChange(normalized)
    close()
  }

  const clear = () => {
    const empty = clearTeacherProfile(course)
    setDraft(empty)
    onChange(empty)
  }

  return (
    <dialog ref={dialogRef} className="profile-dialog" onCancel={(event) => { event.preventDefault(); close() }} onClose={onClose} aria-labelledby="profile-title">
      <form method="dialog" onSubmit={submit}>
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">Настройка перед занятием</p>
            <h2 id="profile-title">Данные преподавателя</h2>
          </div>
          <button type="button" className="icon-button" onClick={close} aria-label="Закрыть окно">×</button>
        </div>
        <label>
          ФИО преподавателя
          <input value={draft.fullName} onChange={(event) => setDraft({ ...draft, fullName: event.target.value })} autoComplete="name" />
        </label>
        <label>
          Должность
          <input value={draft.position} onChange={(event) => setDraft({ ...draft, position: event.target.value })} />
        </label>
        <label>
          Кафедра или лаборатория
          <input value={draft.organizationUnit} onChange={(event) => setDraft({ ...draft, organizationUnit: event.target.value })} aria-describedby="organization-help" />
        </label>
        <p id="organization-help" className="field-help">Введите полное официальное название. Последовательный повтор типа подразделения будет убран.</p>
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={clear}>Очистить данные</button>
          <button type="submit" className="button primary">Сохранить</button>
        </div>
      </form>
    </dialog>
  )
}
