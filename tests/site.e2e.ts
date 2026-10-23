import {expect,test} from '@playwright/test'
import fs from 'node:fs'
import {topics} from '../authoring/legacy-course'
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
 await page.getByRole('button',{name:'Закрыть',exact:true}).click();await page.getByRole('button',{name:'Ещё',exact:true}).click();await page.getByRole('button',{name:'Обзор самопроверки',exact:true}).click()
 await expect(page.getByRole('dialog').locator('summary').first()).toContainText('4 / 4 проверено · 4 / 4 баллов')
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

test('all 104 cases expose practical actions and complete result rows without quizzes',async({page})=>{
 test.setTimeout(240_000)
 const learning=JSON.parse(fs.readFileSync('public/learning.json','utf8'))
 for(const q of learning.questions){
  await page.goto('./?mode=interactive&case='+q.id)
  const work=page.getByRole('region',{name:'Практическое решение',exact:true})
  await expect(page.getByRole('heading',{level:1})).toHaveText(q.case.title)
  await expect(page.locator('textarea,input[type=radio]')).toHaveCount(0)
  for(const v of q.case.practical.variants){
   if(q.case.practical.variants.length>1)await work.getByRole('combobox').selectOption(v.id)
   for(const [i,stage] of v.stages.entries()){
    await work.locator('.action-sequence button').nth(i).click()
    await expect(work.locator('.practical-stage')).toHaveAttribute('data-step',String(i))
    await expect(work.locator('.database-table')).toHaveCount(stage.tables.length)
    const result=work.locator('.operation-result')
    expect(await result.locator('tbody tr').evaluateAll(rows=>rows.map(r=>Array.from(r.children).map(c=>c.textContent)))).toEqual(stage.result?.rows.map((r:string[])=>r.map(v=>v===''?'∅ (пустой текст)':v))||[])
    if(stage.sql)await expect(work.locator('.operation-code code')).toHaveText(stage.sql)
   }
   await work.getByRole('button',{name:'Повторить',exact:true}).click()
   await expect(work.locator('.practical-stage')).toHaveAttribute('data-step','0')
  }
 }
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.includes(':answers:')).length)).toBe(0)
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
 await expect(page.locator('.print-page')).toHaveCount(c.lectures.reduce((sum:number,l:{slides:unknown[]})=>sum+l.slides.length,0));await page.evaluate(()=>document.fonts.ready)
 const overflow=await page.locator('.paper-content').evaluateAll(els=>els.filter(e=>e.scrollHeight>e.clientHeight+3).map(e=>({id:e.parentElement?.getAttribute('data-slide-id'),over:e.scrollHeight-e.clientHeight})))
 fs.mkdirSync('outputs/verification',{recursive:true});fs.writeFileSync('outputs/verification/layout-overflow.json',JSON.stringify(overflow,null,2))
 expect(overflow).toEqual([])
 // The frame can fit while a nested code/table scroller hides the final rows.
 await page.setViewportSize({width:1280,height:800})
 const dense=c.lectures.flatMap((l:{id:string;slides:{id:string}[]})=>l.slides.filter(s=>/-(procedure-example|procedure-body-finish|trigger-example|insert-resolved|requests-ddl-end|index-register-example|matrix-example|final-run-example)$/.test(s.id)).map(s=>({lecture:l.id,id:s.id})))
 for(const mode of ['viewer','presenter'])for(const s of dense){
  await page.goto('./?'+new URLSearchParams({mode,lecture:s.lecture,slide:s.id}))
  await expect(page.locator('.paper')).toHaveAttribute('data-slide-id',s.id)
  const clipping=await page.locator('.paper-content').evaluate(e=>({outer:e.scrollHeight-e.clientHeight,inner:Array.from(e.querySelectorAll('pre,.table-scroll')).filter(x=>x.scrollHeight>x.clientHeight+3||x.scrollWidth>x.clientWidth+3).length}))
  expect(clipping,s.id+' / '+mode).toEqual({outer:expect.any(Number),inner:0})
  expect(clipping.outer,s.id+' / '+mode).toBeLessThanOrEqual(3)
 }
})

test('transaction actions restore rows on undo and distinguish COMMIT from ROLLBACK',async({page})=>{
 await page.goto('./?mode=interactive&case=s08-02-coordinated-data-changes-content-boundary')
 const work=page.getByRole('region',{name:'Практическое решение',exact:true})
 await work.locator('.action-sequence button').nth(4).click()
 await expect(work.locator('.operation-result')).toContainText('ROLLBACK')
 await expect(work.locator('.database-table').first().locator('tbody')).toContainText('WORK')
 await expect(work.locator('.database-table').nth(2).locator('tbody tr')).toHaveCount(0)
 await work.getByRole('button',{name:'Отменить шаг',exact:true}).click()
 await expect(work.locator('.database-table').first().locator('tbody')).toContainText('CLOSED')
 await expect(work.locator('.database-table').nth(2).locator('tbody tr')).toHaveCount(1)
 await work.getByRole('combobox').selectOption('success')
 await expect(work.locator('.practical-stage')).toHaveAttribute('data-step','0')
 await work.locator('.action-sequence button').nth(4).click()
 await expect(work.locator('.operation-result')).toContainText('COMMIT')
 await expect(work.locator('.database-table').nth(1).locator('tbody tr')).toHaveCount(1)
 await page.reload();await expect(work.locator('.operation-result')).toContainText('COMMIT')
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

test('reference layouts show the mascot, complete topic map, QR cards and slide-only folio',async({page})=>{
 await page.setViewportSize({width:1280,height:800});await page.goto('./')
 await expect(page.locator('.ok-footer')).toHaveCount(0);await expect(page.locator('.ok-rhino')).toBeVisible()
 expect(await page.locator('.ok-rhino').evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>500)).toBe(true)
 await page.goto(`./?lecture=${l.id}&slide=${l.slides[0].id}`)
 await expect(page.locator('.slide-eyebrow')).toHaveText('ЛЕКЦИЯ');await expect(page.locator('.paper footer')).toHaveText('01')
 expect(await page.locator('.wordmark').evaluate((e:HTMLImageElement)=>e.naturalWidth>e.naturalHeight*4)).toBe(true)
 expect(await page.locator('.toolbar-title').evaluate(e=>getComputedStyle(e).borderLeftWidth)).toBe('4px')
 await expect(page.getByRole('button',{name:'Следующий слайд',exact:true})).toHaveText('Вперёд')
 for(const topic of topics){
  const lecture=c.lectures.find((x:{id:string})=>x.id===topic.id),agenda=lecture.slides.find((s:{kind:string})=>s.kind==='agenda')
  await page.goto(`./?lecture=${lecture.id}&slide=${agenda.id}`)
  await expect(page.locator('.topic-map li b')).toHaveText(topic.questions.map(q=>q.title))
 }
 const literature=l.slides.find((s:{kind:string})=>s.kind==='literature'),materials=l.slides.find((s:{kind:string})=>s.kind==='materials')
 await page.goto(`./?lecture=${l.id}&slide=${literature.id}`);await expect(page.locator('.reading-card')).toHaveCount(2);await expect(page.locator('.reading-card img')).toHaveCount(2)
 await page.goto(`./?lecture=${l.id}&slide=${materials.id}`);await expect(page.locator('.materials-card img')).toBeVisible();await expect(page.locator('.materials-card a')).toHaveAttribute('href',c.materialsUrl)
})

test('diagram play pauses at a fractional position, resumes, and supports reduced motion',async({page})=>{
 const lecture=c.lectures[8],slide=lecture.slides.find((s:{id:string})=>s.id.endsWith('procedure-example')),storage='trzbd:visual:'+slide.id
 await page.goto(`./?lecture=${lecture.id}&slide=${slide.id}`)
 const controls=page.getByRole('group',{name:'Пошаговая схема',exact:true})
 await expect(controls).toBeVisible();await page.waitForTimeout(220)
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'{"step":0,"fraction":0}'),storage)).toEqual({step:0,fraction:0})
 await controls.getByRole('button',{name:'Показать',exact:true}).click();await page.waitForTimeout(420);await controls.getByRole('button',{name:'Пауза',exact:true}).click()
 const paused=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),storage);expect(paused.fraction).toBeGreaterThan(.1)
 await page.waitForTimeout(240);expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),storage)).toEqual(paused)
 await controls.getByRole('button',{name:'Показать',exact:true}).click();await page.waitForTimeout(260);await controls.getByRole('button',{name:'Пауза',exact:true}).click()
 const resumed=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),storage);expect(resumed.step+resumed.fraction).toBeGreaterThan(paused.step+paused.fraction)
 await controls.getByRole('button',{name:'Далее',exact:true}).click();await expect(page.locator('.code-line.model-focus')).toHaveCount(1)
 await controls.getByRole('button',{name:'Повторить',exact:true}).click();await expect(controls).toContainText('Шаг 0 /')
 await page.emulateMedia({reducedMotion:'reduce'});await expect(controls.getByRole('button',{name:'Показать',exact:true})).toBeDisabled();await controls.getByRole('button',{name:'Далее',exact:true}).click();await expect(page.locator('.code-line.model-focus')).toHaveCount(1)
 await page.emulateMedia({reducedMotion:'no-preference'});await controls.getByRole('button',{name:'Показать',exact:true}).click();await page.waitForTimeout(150)
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))})
 await expect(controls.getByRole('button',{name:'Показать',exact:true})).toBeVisible();const hidden=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),storage)
 await page.evaluate(()=>{delete (document as Document&{hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'))});await page.waitForTimeout(180)
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),storage)).toEqual(hidden)
})

test('switching practical conditions cancels an in-flight operation',async({page})=>{
 await page.goto('./?mode=interactive&case=s08-02-coordinated-data-changes-content-boundary')
 const work=page.getByRole('region',{name:'Практическое решение',exact:true})
 await work.getByRole('button',{name:'Показать',exact:true}).click();await page.waitForTimeout(300)
 await work.getByRole('combobox').selectOption('success')
 await expect(work.locator('.practical-stage')).toHaveAttribute('data-step','0')
 await expect(work.getByRole('button',{name:'Показать',exact:true})).toBeVisible()
 await page.waitForTimeout(1900);await expect(work.locator('.practical-stage')).toHaveAttribute('data-step','0')
})

test('diagram steps and animated focus sync to the audience without controls',async({page,context})=>{
 const lecture=c.lectures[8],slide=lecture.slides.find((s:{id:string})=>s.id.endsWith('procedure-example'))
 await page.goto(`./?lecture=${lecture.id}&slide=${slide.id}`)
 const pending=context.waitForEvent('page');await page.getByRole('button',{name:'Режим показа',exact:true}).click();const audience=await pending
 await expect(audience.locator('.paper')).toHaveAttribute('data-slide-id',slide.id)
 const controls=page.getByRole('group',{name:'Пошаговая схема',exact:true});await controls.getByRole('button',{name:'Показать',exact:true}).click()
 await expect(audience.locator('.code-line.model-focus')).toHaveCount(1);await controls.getByRole('button',{name:'Пауза',exact:true}).click()
 await expect(audience.getByRole('group',{name:'Пошаговая схема',exact:true})).toHaveCount(0)
 await controls.getByRole('button',{name:'Далее',exact:true}).click();await expect(audience.locator('.code-line.model-focus')).toHaveText(await page.locator('.code-line.model-focus').innerText())
 await page.getByRole('button',{name:'Завершить показ',exact:true}).click();await expect(audience.locator('.black-screen')).toBeVisible();await audience.close()
})

test('practical case remains in presenter and syncs actions and conditions to audience',async({page,context})=>{
 const learning=JSON.parse(fs.readFileSync('public/learning.json','utf8')),q=learning.questions.find((q:{id:string})=>q.id==='s08-02-coordinated-data-changes-content-boundary')
 await page.goto('./?lecture='+q.case.lectureId+'&slide='+q.passportId)
 const pending=context.waitForEvent('page');await page.getByRole('button',{name:'Режим показа',exact:true}).click();const audience=await pending
 await page.getByRole('button',{name:'Разбор кейса ↗',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Разбор кейса',exact:true})).toBeVisible()
 expect(new URL(page.url()).searchParams.get('mode')).toBe('presenter')
 await expect(audience.locator('.case-projection')).toBeVisible()
 await expect(audience.locator('textarea,input,select,button')).toHaveCount(0)
 const work=page.getByRole('region',{name:'Практическое решение',exact:true})
 await work.locator('.action-sequence button').nth(4).click()
 await expect(audience.locator('.operation-result')).toContainText('ROLLBACK')
 await work.getByRole('combobox').selectOption('success')
 await expect(audience.locator('.practical-stage')).toHaveAttribute('data-step','0')
 await work.locator('.action-sequence button').nth(4).click()
 await expect(audience.locator('.operation-result')).toContainText('COMMIT')
 await expect(audience.locator('.database-table').nth(1).locator('tbody tr')).toHaveCount(1)
 expect((await audience.locator('.practical-stage').boundingBox())!.y).toBeLessThan(100)
 await audience.screenshot({path:'outputs/verification/practical-audience.png'})
 await page.getByRole('button',{name:'← К слайдам',exact:true}).click()
 await expect(audience.locator('.case-projection')).toHaveCount(0)
 await expect(audience.locator('.paper')).toHaveAttribute('data-slide-id',q.passportId)
 await audience.close()
})

test('matching dropdowns remain readable and keyboard usable in presenter mode and contents names questions',async({page})=>{
 for(const lecture of c.lectures){
  const s=lecture.slides.find((s:{task?:{type:string}})=>s.task?.type==='matching')
  await page.setViewportSize({width:1280,height:800});await page.goto(`./?mode=presenter&lecture=${lecture.id}&slide=${s.id}`)
  const select=page.getByRole('combobox').first();await expect(select).toBeVisible()
  expect(await select.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(14)
  await select.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(select).not.toHaveValue('')
  expect(new URL(page.url()).searchParams.get('slide')).toBe(s.id)
  await page.getByRole('button',{name:'Содержание',exact:true}).click();await expect(page.getByRole('dialog').getByRole('button',{name:/Вопрос 1\./})).toHaveCount(1);await page.getByRole('button',{name:'Закрыть',exact:true}).click()
 }
})

test('JOIN alternatives change actual pairs and aggregates',async({page})=>{
 for(const suffix of ['joins','outer','aggregate']){
  await page.goto('./?mode=interactive&case=s07-07-control-queries-content-'+suffix)
  const work=page.getByRole('region',{name:'Практическое решение',exact:true})
  await work.locator('.action-sequence button').nth(1).click()
  if(suffix==='joins')await expect(work.locator('.operation-result tbody tr')).toHaveCount(2)
  await work.locator('.action-sequence button').nth(2).click()
  if(suffix==='aggregate')await expect(work.locator('.operation-result tbody tr').last()).toHaveText('B510')
  if(suffix==='outer')await expect(work.locator('.operation-result tbody tr')).toHaveCount(1)
  await work.getByRole('combobox').selectOption('changed')
  await expect(work.locator('.practical-stage')).toHaveAttribute('data-step','0')
  await work.locator('.action-sequence button').nth(2).click()
  await expect(work.locator('.operation-result tbody tr')).toHaveCount(suffix==='joins'?3:2)
  if(suffix==='aggregate')await expect(work.locator('.operation-result tbody tr').last()).toHaveText('B511')
  else await expect(work.locator('.operation-result')).toContainText('NULL')
 }
})
