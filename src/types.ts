export type TeacherProfile = {
  fullName: string
  position: string
  organizationUnit: string
}

export type CourseConfig = {
  id: 'trzbd'
  course: number
  semesters: number[]
  discipline: string
  module: string
  specialty: string
  qualification: string
  semesterThemes: Record<number, string>
  materialsUrl: string
  repository: string
  pagesUrl: string
  basePath: string
  primaryDbms: 'MySQL 8.4'
  comparisonDbms?: 'PostgreSQL 18'
  realisticCase: string
  totals: {
    allHours: number
    lectureHours: number
    labHours: number
    consultationHours: number
    independentHours: number
  }
}

export type TopicQuestion = {
  title: string
  focus: string
  rule: string
  example: string
  decision: string
  pitfall: string
  check: string
}

export type LectureTopic = {
  id: string
  courseId: CourseConfig['id']
  semester: number
  lectureHours: number
  competencies: string[]
  labNumbers: number[]
  sourceTitle: string
  sourceContent: string[]
  displayTitle: string
  sourceIds: string[]
  objective: string
  caseBrief: string
  diagnostic: string
  projectArtifact: string
  nextStep: string
  codeLabel: string
  codeSample: string
  questions: TopicQuestion[]
}

export type SourceRecord = {
  id: string
  title: string
  type: 'plan' | 'curriculum' | 'book' | 'documentation' | 'materials' | 'brand' | 'reference'
  purpose: string
  location: string
  localCopy?: string
  version: string
  checkedAt: string
  official: boolean
  publication: string
  usedIn: string[]
}

export type TestMode = 'single' | 'multiple' | 'boolean' | 'matching' | 'order' | 'short'

export type TestTask = {
  id: string
  mode: TestMode
  prompt: string
  options?: string[]
  correctAnswer: string
  correctIndexes?: number[]
  explanation: string
  hint: string
  criteria: string
}

export type SlideKind =
  | 'title'
  | 'service'
  | 'intro'
  | 'divider'
  | 'concept'
  | 'example'
  | 'decision'
  | 'warning'
  | 'check'
  | 'practice'
  | 'test'
  | 'summary'
  | 'questions'

export type Slide = {
  number: number
  kind: SlideKind
  title: string
  kicker: string
  body?: string
  bullets?: string[]
  code?: string
  codeLabel?: string
  links?: { label: string; url: string }[]
  sourceIds: string[]
  questionNumber?: number
  test?: TestTask
}

export type TestAnswers = Record<string, string | number[]>
