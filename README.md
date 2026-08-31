# МДК.11.01 «Технология разработки и защиты баз данных»

Адаптивный сайт-презентация для 4-го курса специальности 09.02.07 «Информационные системы и программирование», квалификация «программист».

Курс содержит 13 утверждённых лекционных тем:

- 7-й семестр — 7 тем, 20 лекционных часов;
- 8-й семестр — 6 тем, 18 лекционных часов;
- каждая тема — ровно 85 экранов: 80 базовых и 5 служебных.

Объём МДК.11.01: 136 часов, включая 38 лекционных, 64 часа лабораторных работ и практических занятий, 2 часа консультации и 32 часа самостоятельной работы. Промежуточная аттестация — зачёт с оценкой.

## Возможности

- каталог, поиск и фильтр по семестрам;
- прямые ссылки вида `?topic=[TOPIC_ID]&slide=[1..85]`;
- клавиатурная навигация, полноэкранный режим, светлая и тёмная темы;
- сохранение профиля преподавателя, ответов и прогресса в `localStorage`;
- шесть тематических заданий и отдельное окно результата;
- маршрут `/print?topic=[TOPIC_ID]&variant=student|teacher`;
- student PDF без ответов и teacher PDF с ответами и критериями;
- локальный Raleway, предоставленные логотип, орнамент, стрелка и маскот;
- QR-код с программной проверкой декодирования.

## Команды

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run spellcheck
npm run build
npm run test:e2e
npm run export:pdf
npm run export:pdf -- --topic [TOPIC_ID]
npm run export:pdf -- --topic [TOPIC_ID] --variant student
npm run export:pdf -- --topic [TOPIC_ID] --variant teacher
npm run check:pdf
```

Для CLI-экспорта с данными преподавателя скопируйте `config/teacher-profile.example.json` в `config/teacher-profile.json`. Файл с реальными данными не предназначен для публикации.

## Адреса

- репозиторий: https://github.com/OlgaKraven/2026-TRZBD-lecture
- GitHub Pages: https://olgakraven.github.io/2026-TRZBD-lecture/
- материалы: https://disk.yandex.ru/d/UoZtXrLwvVWVsQ

Источники, версии и ограничения публикации перечислены в [SOURCES.md](SOURCES.md).
