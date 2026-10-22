import {expect,test} from '@playwright/test'
import fs from 'node:fs'
const c=JSON.parse(fs.readFileSync('public/course.json','utf8'))
const l=c.lectures[0],task=l.slides.find((s:{task?:unknown})=>s.task)

test('catalog preserves 13 topics, semester filters and materials',async({page})=>{
 await page.goto('./');await expect(page.locator('.ok-open')).toHaveCount(13)
 for(const sem of [7,8]){await page.getByRole('button',{name:`${sem} семестр`,exact:true}).click();await expect(page.locator('.ok-open')).toHaveCount(sem===7?7:6)}
 await page.getByRole('button',{name:'Материалы — QR-код и ссылка',exact:true}).click()
 await expect(page.getByRole('dialog').getByRole('link')).toHaveAttribute('href',c.materialsUrl)
})
test('legacy links resolve to stable slides',async({page})=>{
 await page.goto(`./?topic=${l.id}&slide=24`);await expect(page.locator('.slide-frame')).toBeVisible();await expect(page).toHaveURL(/lecture=/);await expect(page).not.toHaveURL(/topic=/)
})
test('notes load without password and preserve local edits',async({page,context})=>{
 const slide=l.slides.find((s:{id:string})=>s.id.endsWith('-concept'))
 const key=`lecture:/2026-TRZBD-lecture/:trzbd:private:${c.contentVersion}`
 await page.goto(`./?mode=presenter&lecture=${l.id}&slide=${slide.id}&session=qa-notes`)
 const notes=JSON.parse(fs.readFileSync('public/teacher-notes.json','utf8')).notes
 await expect(page.getByRole('tabpanel')).toContainText(notes[slide.id].script)
 await expect(page.getByRole('dialog')).toHaveCount(0)
 expect(await page.evaluate(key=>Object.keys(JSON.parse(localStorage.getItem(key)||'{}')).length,key)).toBe(c.lectures.reduce((sum:number,l:{slides:unknown[]})=>sum+l.slides.length,0))
 await page.evaluate(({key,id})=>{const n=JSON.parse(localStorage.getItem(key)||'{}');n[id].script='Проверочная локальная заметка';localStorage.setItem(key,JSON.stringify(n))},{key,id:slide.id})
 await page.reload();await expect(page.getByRole('tabpanel')).toContainText('Проверочная локальная заметка')
 const audience=await context.newPage();const requests:string[]=[];audience.on('request',r=>requests.push(r.url()))
 await audience.goto(`./?mode=audience&lecture=${l.id}&session=qa-notes`);await expect(audience.locator('.slide-frame')).toBeVisible();expect(requests.filter(u=>u.includes('teacher-notes'))).toHaveLength(0)
})
test('mobile stores reply and opens its explanation only on request',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(`./?lecture=${l.id}&slide=${task.id}`)
 await page.getByRole('radio').first().check();await page.getByRole('button',{name:'Проверить',exact:true}).click();await expect(page.getByText('Ответ сохранён',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Разбор ответа',exact:true})).toHaveCount(0)
 await page.reload();await expect(page.getByText('Ответ сохранён',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await page.getByRole('button',{name:'Пояснение к случаю',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Правильный ответ и разбор')
})
test('student print contains slides without notes, answers or interactive forms',async({page})=>{
 await page.emulateMedia({media:'print'});await page.goto(`./?mode=print&scope=${l.id}`);await expect(page.locator('.print-page')).toHaveCount(l.slides.length)
 await expect(page.locator('.print-page textarea:visible,.print-page input:visible,.print-page button:visible')).toHaveCount(0)
 await expect(page.locator('.print-page')).not.toContainText(['Проверочная локальная заметка'])
})

test('all four assessment types score taught answers on desktop',async({page})=>{
 const keys=JSON.parse(fs.readFileSync('public/assessment.json','utf8')).keys
 await page.setViewportSize({width:1366,height:900})
 for(const type of ['single','multiple','short','matching']){
  const slide=l.slides.find((s:{task?:{type:string}})=>s.task?.type===type)
  const t=slide.task,k=keys[t.id];await page.goto(`./?lecture=${l.id}&slide=${slide.id}`)
  await page.getByRole('button',{name:'Проверить',exact:true}).click();await expect(page.locator('.task-status')).toHaveCount(0)
  if(t.type==='single'||t.type==='multiple'){
   for(const id of k.correct){const option=t.options.find((o:{id:string})=>o.id===id);await page.getByRole(t.type==='single'?'radio':'checkbox',{name:new RegExp(option.text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).check()}
  }else if(t.type==='short')await page.getByRole('textbox',{name:'Краткий ответ',exact:true}).fill(k.accepted[0])
  else for(const item of t.items)await page.getByRole('combobox',{name:`Соответствие: ${item.text}`,exact:true}).selectOption(k.pairs[item.id])
  await page.getByRole('button',{name:'Проверить',exact:true}).click();await expect(page.locator('.task-status')).toContainText('Правильно');await page.getByRole('button',{name:'Разбор ответа',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Правильный ответ')
 }
})

test('arrow navigation survives clicked buttons and leaves input editing alone',async({page})=>{
 const concept=l.slides.find((s:{id:string})=>s.id.endsWith('-concept'))
 await page.goto(`./?lecture=${l.id}&slide=${concept.id}`)
 await page.getByRole('button',{name:'Следующий слайд',exact:true}).click()
 const before=page.url();await page.keyboard.press('ArrowRight');await expect(page).not.toHaveURL(before)
 const short=l.slides.find((s:{task?:{type:string}})=>s.task?.type==='short')
 await page.goto(`./?lecture=${l.id}&slide=${short.id}`)
 await page.getByRole('textbox',{name:'Краткий ответ',exact:true}).fill('12')
 const current=page.url();await page.keyboard.press('ArrowLeft');expect(page.url()).toBe(current)
})

test('each independent case supports a wrong and correct attempt without changing main scores',async({page})=>{
 test.setTimeout(240_000)
 const learning=JSON.parse(fs.readFileSync('public/learning.json','utf8'))
 for(const q of learning.questions){
  const item=q.case
  await page.goto(`./?mode=interactive&case=${item.id}`)
  await expect(page.getByRole('heading',{level:1})).toHaveText(item.title)
  await expect(page.locator('.case-feedback')).toHaveCount(0)
  await page.getByLabel('Мой прогноз',{exact:true}).fill('Сначала проверю условия и ожидаемый эффект.')
  await page.getByRole('button',{name:'Далее',exact:true}).click();await page.getByRole('button',{name:'Далее',exact:true}).click()
  await page.getByRole('radio').nth((item.correct+1)%item.options.length).check()
  await page.getByLabel('Моё обоснование',{exact:true}).fill('Сопоставляю решение с исходным условием.')
  await page.getByRole('button',{name:'Проверить решение',exact:true}).click();await expect(page.locator('.case-feedback')).toContainText('Пересмотрите выбор')
  await page.getByRole('radio').nth(item.correct).check()
  await page.getByRole('button',{name:'Проверить решение',exact:true}).click();await expect(page.locator('.case-feedback')).toContainText('Выбор верен')
  await expect(page.locator('.case-feedback')).toContainText(item.reason)
 }
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.includes(':answers:')).length)).toBe(0)
 await page.reload();await expect(page.locator('.case-feedback')).toContainText('Выбор верен')
 await expect(page.getByLabel('Мой прогноз',{exact:true})).not.toBeEmpty()
})

test('teacher and audience sync only public state and reveal answers explicitly',async({page,context})=>{
 const slide=l.slides.find((s:{task?:unknown})=>s.task)
 await page.goto(`./?lecture=${l.id}&slide=${slide.id}`)
 const opened=context.waitForEvent('page');await page.getByRole('button',{name:'Режим показа',exact:true}).click();const audience=await opened
 await expect(page).toHaveURL(/mode=presenter/);await expect(audience.locator('.paper')).toHaveAttribute('data-slide-id',slide.id)
 await page.getByRole('tab',{name:'Ответ',exact:true}).click();await expect(audience.locator('.static-task aside')).toHaveCount(0)
 await page.getByRole('tab',{name:'Личные заметки',exact:true}).click();await page.getByLabel('Личная заметка',{exact:true}).fill('Личная запись проверки двух окон')
 await expect(audience.locator('body')).not.toContainText('Личная запись проверки двух окон')
 await page.getByRole('button',{name:'Показать ответ аудитории',exact:true}).click();await expect(audience.locator('.static-task aside')).toBeVisible()
 await page.getByRole('button',{name:'Ещё',exact:true}).click();await page.getByRole('button',{name:'Включить тёмную тему',exact:true}).click();await expect(audience.locator('html')).toHaveAttribute('data-theme','dark');await page.getByRole('button',{name:'Закрыть',exact:true}).click()
 await page.getByRole('button',{name:'Указка',exact:true}).click();await page.locator('.paper').hover({position:{x:100,y:100}});await expect(audience.locator('.laser')).toBeVisible()
 await page.getByRole('button',{name:'Следующий слайд',exact:true}).click();await expect(audience.locator('.paper')).not.toHaveAttribute('data-slide-id',slide.id)
 await page.getByRole('button',{name:'Завершить показ',exact:true}).click();await expect(audience.locator('.black-screen')).toBeVisible();await audience.close()
})

test('all preserved pages fit printable frames with complete definitions and code',async({page})=>{
 test.setTimeout(90_000)
 await page.setViewportSize({width:1280,height:720});await page.goto('./?mode=print&scope=all')
 await expect(page.locator('.print-page')).toHaveCount(974);await page.evaluate(()=>document.fonts.ready)
 const overflow=await page.locator('.paper-content').evaluateAll(els=>els.filter(e=>e.scrollHeight>e.clientHeight+3).map(e=>({id:e.parentElement?.getAttribute('data-slide-id'),over:e.scrollHeight-e.clientHeight})))
 fs.mkdirSync('outputs/verification',{recursive:true});fs.writeFileSync('outputs/verification/layout-overflow.json',JSON.stringify(overflow,null,2))
 expect(overflow).toEqual([])
})

test('transaction model restores data on back and resets safely on scenario change',async({page})=>{
 const learning=JSON.parse(fs.readFileSync('public/learning.json','utf8'))
 const q=learning.questions.find((q:{id:string})=>q.id==='s08-02-coordinated-data-changes-content-boundary')
 await page.goto(`./?mode=interactive&case=${q.id}`)
 await page.getByLabel('Мой прогноз',{exact:true}).fill('При отказе оба изменения должны откатиться.')
 await page.getByRole('button',{name:'Далее',exact:true}).click();await page.getByRole('button',{name:'Далее',exact:true}).click()
 await page.getByRole('radio').nth(q.case.correct).check();await page.getByLabel('Моё обоснование',{exact:true}).fill('Атомарность связывает оба факта.')
 await page.getByRole('button',{name:'Проверить решение',exact:true}).click()
 const model=page.getByRole('region',{name:'Предметная модель'})
 for(let i=0;i<3;i++)await model.getByRole('button',{name:'Далее по модели',exact:true}).click()
 await expect(model.locator('tbody')).toContainText('ROLLBACK');await expect(model.locator('tbody')).toContainText('WORK')
 await model.getByRole('button',{name:'Назад по модели',exact:true}).click();await expect(model.locator('tbody')).toContainText('Не подтверждено')
 await model.getByRole('combobox').selectOption('success');await expect(model).toContainText('Шаг 0 / 3');await expect(model.locator('tbody')).toContainText('WORK')
 for(let i=0;i<3;i++)await model.getByRole('button',{name:'Далее по модели',exact:true}).click()
 await expect(model.locator('tbody')).toContainText('COMMIT');await page.reload();await expect(model.locator('tbody')).toContainText('COMMIT')
})

test('previous personal script edits migrate without replacing revised defaults',async({page})=>{
 const slide=l.slides.find((s:{id:string})=>s.id.endsWith('-concept'))
 await page.goto('./')
 await page.evaluate(({id})=>{localStorage.setItem('lecture:/2026-TRZBD-lecture/:trzbd:private:trzbd-2026.10.22-content-all-r4',JSON.stringify({[id]:{script:'Собственный текст до обновления'}}))},{id:slide.id})
 await page.goto(`./?mode=presenter&lecture=${l.id}&slide=${slide.id}`)
 await expect(page.getByRole('tabpanel')).toContainText('Собственный текст до обновления')
 const download=await page.request.get(`./teacher-text/lecture-01.teacher.md`)
 expect(download.status()).toBe(200);expect((await download.text()).startsWith('# 1.')).toBe(true)
 const pending=page.waitForEvent('download');await page.getByRole('link',{name:'Скачать текст преподавателя',exact:true}).click();expect((await pending).suggestedFilename()).toBe('lecture-01.teacher.md')
})
