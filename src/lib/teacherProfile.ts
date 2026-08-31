import type { CourseConfig, TeacherProfile } from '../types'

export const emptyTeacherProfile: TeacherProfile = {
  fullName: '',
  position: '',
  organizationUnit: '',
}

export const normalizeOrganizationUnit = (value: string) => {
  const compact = value.trim().replace(/\s+/g, ' ')
  return compact
    .replace(/^(кафедра)(?:\s+кафедра)+\s+/i, '$1 ')
    .replace(/^(лаборатория)(?:\s+лаборатория)+\s+/i, '$1 ')
}

const normalizeProfile = (profile: TeacherProfile): TeacherProfile => ({
  fullName: profile.fullName.trim().replace(/\s+/g, ' '),
  position: profile.position.trim().replace(/\s+/g, ' '),
  organizationUnit: normalizeOrganizationUnit(profile.organizationUnit),
})

export const teacherProfileKey = (_course: CourseConfig) => 'trzbd.teacherProfile'

export const loadTeacherProfile = (course: CourseConfig): TeacherProfile => {
  try {
    const stored = localStorage.getItem(teacherProfileKey(course))
    if (!stored) return emptyTeacherProfile
    return normalizeProfile(JSON.parse(stored) as TeacherProfile)
  } catch {
    return emptyTeacherProfile
  }
}

export const saveTeacherProfile = (course: CourseConfig, profile: TeacherProfile) => {
  const normalized = normalizeProfile(profile)
  localStorage.setItem(teacherProfileKey(course), JSON.stringify(normalized))
  return normalized
}

export const clearTeacherProfile = (course: CourseConfig) => {
  localStorage.removeItem(teacherProfileKey(course))
  return emptyTeacherProfile
}
