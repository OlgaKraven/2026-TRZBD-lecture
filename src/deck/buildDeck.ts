import type { CourseConfig, LectureTopic, Slide, TestTask } from '../types'

const mainLiterature = [
  {
    label:
      'Волк, В. К. Базы данных : учебник / В. К. Волк, В. Ю. Осеев, О. С. Черепанов. — Москва, Вологда : Инфра-Инженерия, 2025. — 544 с. — ISBN 978-5-9729-2594-0. — Текст : электронный // Образовательная платформа IPR СМАРТ : [сайт]. — URL: https://www.iprbookshop.ru/books/154413/details',
    url: 'https://www.iprbookshop.ru/books/154413/details',
  },
  {
    label:
      'Маркин, А. В. Программирование баз данных на SQL и PL/pgSQL. В 2 частях. Ч. 1 : учебник / А. В. Маркин. — Москва : Ай Пи Ар Медиа, 2026. — 443 с. — ISBN 978-5-4497-5154-6 (ч. 1), 978-5-4497-5153-9. — Текст : электронный // Образовательная платформа IPR СМАРТ : [сайт]. — URL: https://www.iprbookshop.ru/books/158904/details',
    url: 'https://www.iprbookshop.ru/books/158904/details',
  },
  {
    label:
      'Маркин, А. В. Программирование баз данных на SQL и PL/pgSQL. В 2 частях. Ч. 2 : учебник / А. В. Маркин. — Москва : Ай Пи Ар Медиа, 2026. — 497 с. — ISBN 978-5-4497-5155-3 (ч. 2), 978-5-4497-5153-9. — Текст : электронный // Образовательная платформа IPR СМАРТ : [сайт]. — URL: https://www.iprbookshop.ru/books/158905/details',
    url: 'https://www.iprbookshop.ru/books/158905/details',
  },
]

const additionalLiterature = [
  {
    label:
      'Кузьменко, И. П. Базы данных и SQL : учебник / И. П. Кузьменко. — Ставрополь : АГРУС, 2024. — 128 с. — Текст : электронный // Образовательная платформа IPR СМАРТ : [сайт]. — URL: https://www.iprbookshop.ru/books/148263/details',
    url: 'https://www.iprbookshop.ru/books/148263/details',
  },
  {
    label:
      'Евстифеева, Н. А. Теоретические основы баз данных и практическое применение языка SQL c примерами запросов на языке SQL/PSM для СУБД MySQL : учебник / Н. А. Евстифеева. — Москва : Издательский Дом МИСиС, 2025. — 248 с. — ISBN 978-5-907833-53-1. — Текст : электронный // Образовательная платформа IPR СМАРТ : [сайт]. — URL: https://www.iprbookshop.ru/books/163292/details',
    url: 'https://www.iprbookshop.ru/books/163292/details',
  },
]

const makeTests = (topic: LectureTopic): TestTask[] => {
  const [q1, q2, q3, q4, q5, q6] = topic.questions
  return [
    {
      id: `${topic.id}-single`,
      mode: 'single',
      prompt: `Какое решение соответствует вопросу «${q1.title}»?`,
      options: [q1.decision, q1.pitfall, 'Пропустить проверку и перейти к следующему этапу', 'Заменить исходные учебные данные случайными значениями'],
      correctIndexes: [0],
      correctAnswer: q1.decision,
      explanation: `Решение опирается на правило: ${q1.rule}`,
      hint: 'Ищите вариант с явным артефактом и способом проверки.',
      criteria: 'Выбрано проверяемое проектное решение без потери исходных данных.',
    },
    {
      id: `${topic.id}-multiple`,
      mode: 'multiple',
      prompt: `Какие два действия создают доказательную основу для вопроса «${q2.title}»?`,
      options: [q2.rule, q2.check, q2.pitfall, 'Удалить протокол после получения результата'],
      correctIndexes: [0, 1],
      correctAnswer: `${q2.rule}; ${q2.check}`,
      explanation: 'Корректная работа соединяет правило выполнения с критерием качества.',
      hint: 'Выберите действие и проверяемый критерий.',
      criteria: 'Отмечены оба правильных пункта, ошибочные действия не выбраны.',
    },
    {
      id: `${topic.id}-boolean`,
      mode: 'boolean',
      prompt: `Верно ли утверждение: «${q3.pitfall}» — корректный способ работы?`,
      options: ['Верно', 'Неверно'],
      correctIndexes: [1],
      correctAnswer: 'Неверно',
      explanation: `Это типичная ошибка. Корректное правило: ${q3.rule}`,
      hint: 'Сопоставьте утверждение с требованием воспроизводимости.',
      criteria: 'Выбран ответ «Неверно», причина объяснена риском для данных или проверки.',
    },
    {
      id: `${topic.id}-matching`,
      mode: 'matching',
      prompt: `Выберите корректную пару «ситуация → решение» для вопроса «${q4.title}».`,
      options: [
        `${q4.example} → ${q4.decision}`,
        `${q4.example} → ${q4.pitfall}`,
        `${q4.pitfall} → скрыть результат`,
        'Любая ситуация → отключить ограничения целостности',
      ],
      correctIndexes: [0],
      correctAnswer: `${q4.example} → ${q4.decision}`,
      explanation: 'Ситуация и решение относятся к одному артефакту и имеют критерий проверки.',
      hint: 'Не выбирайте действие, которое скрывает причину расхождения.',
      criteria: 'Выбрана связная пара без необоснованного обхода ограничений.',
    },
    {
      id: `${topic.id}-order`,
      mode: 'order',
      prompt: `Восстановите порядок работы с вопросом «${q5.title}».`,
      options: ['1. Зафиксировать исходные условия', '2. Применить согласованное правило', '3. Сформировать проектный артефакт', '4. Выполнить контрольную проверку'],
      correctIndexes: [0, 1, 2, 3],
      correctAnswer: `1 → 2 → 3 → 4; решение: ${q5.decision}`,
      explanation: 'Исходное состояние предшествует изменению, а контроль завершает сценарий.',
      hint: 'Проверка результата всегда следует после формирования артефакта.',
      criteria: 'Все четыре шага расположены от фиксации исходных условий к контролю.',
    },
    {
      id: `${topic.id}-short`,
      mode: 'short',
      prompt: `Коротко объясните, как проверить вопрос «${q6.title}» в базе учебной сети сервисных центров.`,
      correctAnswer: q6.check,
      explanation: `Ориентир для самопроверки: ${q6.decision}`,
      hint: 'Назовите исходное условие, действие, артефакт и критерий.',
      criteria: 'В ответе есть проверяемый результат. Автоматическая оценка свободного текста не выполняется.',
    },
  ]
}

export const buildDeck = (topic: LectureTopic, course: CourseConfig): Slide[] => {
  const sourceIds = Array.from(new Set(['rpd-pm11-2026', ...topic.sourceIds]))
  const slides: Omit<Slide, 'number'>[] = [
    {
      kind: 'title',
      kicker: `МДК.11.01 · ${course.course} курс · ${topic.semester} семестр`,
      title: topic.displayTitle,
      body: course.realisticCase,
      bullets: [
        `${topic.lectureHours} лекционных часа · лабораторные № ${topic.labNumbers.join(', ')}`,
        `Компетенции: ${topic.competencies.join(' · ')}`,
      ],
      sourceIds: ['rpd-pm11-2026', 'trzbd-rhino', 'synergy-logo'],
    },
    {
      kind: 'service',
      kicker: `${topic.semester} семестр`,
      title: course.semesterThemes[topic.semester],
      body: 'Навигационная формулировка помогает увидеть развитие сквозного учебного проекта; официальное название темы и содержание взяты из РПД.',
      bullets: [topic.sourceTitle, ...topic.sourceContent],
      sourceIds: ['rpd-pm11-2026', 'curriculum-2025-programmer'],
    },
    {
      kind: 'service',
      kicker: 'Учебная навигация',
      title: 'Основная литература',
      bullets: mainLiterature.map((item) => item.label),
      links: mainLiterature.map((item) => ({ label: 'Открыть источник', url: item.url })),
      sourceIds: ['book-volk-2025', 'book-markin-part1-2026', 'book-markin-part2-2026'],
    },
    {
      kind: 'service',
      kicker: 'Учебная навигация',
      title: 'Дополнительная литература',
      bullets: additionalLiterature.map((item) => item.label),
      links: additionalLiterature.map((item) => ({ label: 'Открыть источник', url: item.url })),
      sourceIds: ['book-kuzmenko-2024', 'book-evstifeeva-2025'],
    },
    {
      kind: 'service',
      kicker: 'Материалы к занятиям',
      title: 'Просканируй меня',
      body: 'QR-код ведёт на предоставленную пользователем папку материалов. Наличие и состав файлов в папке не заявляются без отдельной проверки.',
      links: [{ label: course.materialsUrl, url: course.materialsUrl }],
      sourceIds: ['trzbd-materials', 'synergy-logo'],
    },
    {
      kind: 'intro',
      kicker: 'Введение',
      title: 'Зачем эта тема нужна проекту',
      body: topic.caseBrief,
      bullets: ['Опираемся на выданные учебные данные.', 'Формируем конкретный артефакт.', 'Проверяем результат воспроизводимым способом.'],
      sourceIds,
    },
    {
      kind: 'intro',
      kicker: 'Цель занятия',
      title: topic.objective,
      body: `Результат занятия: ${topic.projectArtifact}.`,
      sourceIds,
    },
    {
      kind: 'example',
      kicker: 'Сквозной кейс',
      title: 'Учебная сеть сервисных центров',
      body: topic.caseBrief,
      bullets: ['Все персональные данные синтетические и помечены как учебные.', 'Секреты задаются локально: DB_PASSWORD=<SET_LOCALLY>.', `Исполняемые примеры рассчитаны на ${course.primaryDbms}.`],
      sourceIds,
    },
    {
      kind: 'intro',
      kicker: 'Карта темы',
      title: 'Восемь вопросов занятия',
      bullets: topic.questions.map((question, index) => `${index + 1}. ${question.title}`),
      sourceIds,
    },
    {
      kind: 'concept',
      kicker: topic.codeLabel,
      title: 'Рабочая модель и безопасный пример',
      body: 'Перед выполнением проверьте версию СУБД, целевую схему, права и резервируемость результата. PostgreSQL-синтаксис в MySQL-примерах не используется.',
      code: topic.codeSample,
      codeLabel: topic.codeLabel,
      sourceIds,
    },
    {
      kind: 'intro',
      kicker: 'Результаты обучения',
      title: 'После занятия ты сможешь',
      bullets: [
        `объяснить содержание темы «${topic.displayTitle}»;`,
        `создать артефакт: ${topic.projectArtifact};`,
        'проверить результат позитивным и негативным сценарием;',
        `связать работу с компетенциями ${topic.competencies.join(', ')}.`,
      ],
      sourceIds,
    },
    {
      kind: 'check',
      kicker: 'Входная диагностика',
      title: topic.diagnostic,
      body: 'Сформулируй предварительный ответ. На экране 83 сравни его с итоговой памяткой.',
      sourceIds,
    },
  ]

  topic.questions.forEach((question, index) => {
    const questionNumber = index + 1
    slides.push(
      {
        kind: 'divider',
        kicker: `ВОПРОС ${questionNumber}`,
        title: question.title,
        body: question.focus,
        sourceIds,
        questionNumber,
      },
      {
        kind: 'concept',
        kicker: `Вопрос ${questionNumber} · определение`,
        title: `Что означает «${question.title}»`,
        body: question.focus,
        bullets: ['Определение связано с конкретным объектом или результатом темы.', 'Граница понятия задаётся учебным кейсом.', 'Термин проверяется по артефакту, SQL или протоколу.'],
        sourceIds,
        questionNumber,
      },
      {
        kind: 'concept',
        kicker: `Вопрос ${questionNumber} · правило`,
        title: 'Принцип работы',
        body: question.rule,
        bullets: ['Исходное состояние фиксируется до изменения.', 'Решение следует из данных предметной области.', 'Критерий качества задаётся заранее.'],
        sourceIds,
        questionNumber,
      },
      {
        kind: 'example',
        kicker: `Вопрос ${questionNumber} · пример`,
        title: 'Ситуация в учебном кейсе',
        body: question.example,
        bullets: [`Условия темы: ${topic.caseBrief}`, `Ожидаемый артефакт: ${topic.projectArtifact}.`, `Проверка: ${question.check}`],
        sourceIds,
        questionNumber,
      },
      {
        kind: 'decision',
        kicker: `Вопрос ${questionNumber} · решение`,
        title: 'Проектное решение',
        body: question.decision,
        bullets: ['Решение фиксируется в SQL, схеме, таблице соответствия или протоколе.', 'Секреты и действующие персональные данные не включаются.', `Критерий приёмки: ${question.check}`],
        sourceIds,
        questionNumber,
      },
      {
        kind: 'warning',
        kicker: `Вопрос ${questionNumber} · ошибка`,
        title: 'Что часто делают неправильно',
        body: question.pitfall,
        bullets: ['Ошибка нарушает целостность, воспроизводимость или понятность результата.', 'Скрытое исправление не считается доказательством.', `Возврат к правилу: ${question.rule}`],
        sourceIds,
        questionNumber,
      },
      {
        kind: 'check',
        kicker: `Вопрос ${questionNumber} · проверка`,
        title: 'Критерий качества',
        body: question.check,
        bullets: [`Понятие: ${question.focus}`, `Решение: ${question.decision}`, 'Ответ должен связывать условия, действие и наблюдаемый результат.'],
        sourceIds,
        questionNumber,
      },
    )
  })

  topic.questions.forEach((question, index) => {
    slides.push({
      kind: 'practice',
      kicker: `Практический блок · шаг ${index + 1} из 8`,
      title: question.title,
      body: question.example,
      bullets: [
        `Выполни: ${question.decision}`,
        `Ожидаемый результат: ${question.check}`,
        `Типичная ошибка: ${question.pitfall}`,
        `Связь с лабораторной работой: № ${topic.labNumbers.join(', ')}.`,
      ],
      code: index === 0 ? topic.codeSample : undefined,
      codeLabel: index === 0 ? topic.codeLabel : undefined,
      sourceIds,
      questionNumber: index + 1,
    })
  })

  makeTests(topic).forEach((test, index) => {
    slides.push({
      kind: 'test',
      kicker: `Итоговое задание ${index + 1} из 6 · ${test.mode}`,
      title: 'Проверь решение',
      body: test.prompt,
      sourceIds,
      test,
    })
  })

  slides.push(
    {
      kind: 'summary',
      kicker: 'Итоговая памятка',
      title: 'От исходных условий к проверенному артефакту',
      body: topic.objective,
      bullets: topic.questions.map((question) => `${question.title}: ${question.decision}`),
      sourceIds,
    },
    {
      kind: 'summary',
      kicker: 'Результат и следующий шаг',
      title: topic.projectArtifact,
      body: `Следующий шаг: ${topic.nextStep}`,
      bullets: ['Сохрани прогресс и ответы.', 'Открой результат отдельной кнопкой.', 'Студенческий PDF доступен через печатный маршрут и CLI, преподавательский — также из интерфейса.'],
      sourceIds,
    },
    {
      kind: 'questions',
      kicker: 'Финал занятия',
      title: 'Вопросы от аудитории',
      body: 'Сформулируй вопрос через исходные условия, объект базы, ожидаемый результат и способ проверки.',
      bullets: ['Какой шаг проекта требует уточнения?', 'Какой SQL или артефакт стоит разобрать ещё раз?', 'Как доказать корректность результата?'],
      sourceIds: ['rpd-pm11-2026', 'trzbd-rhino', 'synergy-logo'],
    },
  )

  const numbered = slides.map((slide, index) => ({ ...slide, number: index + 1 }))
  if (numbered.length !== 85) {
    throw new Error(`Deck invariant failed for ${topic.id}: expected 85 slides, got ${numbered.length}`)
  }
  return numbered
}

export const countServiceSlides = (slides: Slide[]) =>
  slides.filter((slide) => [2, 3, 4, 5, 85].includes(slide.number)).length
