import {expect,test} from '@playwright/test'
import fs from 'node:fs'
const c=JSON.parse(fs.readFileSync('public/course.json','utf8'))
const l=c.lectures[0],task=l.slides.find((s:{task?:unknown})=>s.task)

test('catalog preserves 13 topics, semester filters and materials',async({page})=>{
 await page.goto('./');await expect(page.getByRole('button',{name:'Открыть',exact:true})).toHaveCount(13)
 for(const sem of [7,8]){await page.getByRole('button',{name:`${sem} семестр`,exact:true}).click();await expect(page.getByRole('button',{name:'Открыть',exact:true})).toHaveCount(sem===7?7:6)}
 await expect(page.getByRole('link',{name:'Материалы',exact:true})).toHaveAttribute('href',c.materialsUrl)
})
test('legacy links resolve to stable slides',async({page})=>{
 await page.goto(`./?topic=${l.id}&slide=24`);await expect(page.locator('.slide-frame')).toBeVisible();await expect(page).toHaveURL(/lecture=/);await expect(page).not.toHaveURL(/topic=/)
})
test('notes load without password and preserve local edits',async({page,context})=>{
 const slide=l.slides.find((s:{id:string})=>s.id.endsWith('-concept'))
 const key=`lecture:/2026-TRZBD-lecture/:trzbd:private:${c.contentVersion}`
 await page.goto(`./?mode=presenter&lecture=${l.id}&slide=${slide.id}&session=qa-notes`)
 await expect(page.getByRole('tabpanel')).toContainText('Это объяснение нужно')
 await expect(page.getByRole('dialog')).toHaveCount(0)
 expect(await page.evaluate(key=>Object.keys(JSON.parse(localStorage.getItem(key)||'{}')).length,key)).toBe(1495)
 await page.evaluate(({key,id})=>{const n=JSON.parse(localStorage.getItem(key)||'{}');n[id].script='Проверочная локальная заметка';localStorage.setItem(key,JSON.stringify(n))},{key,id:slide.id})
 await page.reload();await expect(page.getByRole('tabpanel')).toContainText('Проверочная локальная заметка')
 const audience=await context.newPage();const requests:string[]=[];audience.on('request',r=>requests.push(r.url()))
 await audience.goto(`./?mode=audience&lecture=${l.id}&session=qa-notes`);await expect(audience.locator('.slide-frame')).toBeVisible();expect(requests.filter(u=>u.includes('teacher-notes'))).toHaveLength(0)
})
test('mobile submits without exposing answer or result',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(`./?lecture=${l.id}&slide=${task.id}`)
 await page.getByRole('radio').first().check();await page.getByRole('button',{name:'Проверить',exact:true}).click();await expect(page.getByText('Ответ сохранён',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Разбор ответа',exact:true})).toHaveCount(0)
 await page.reload();await expect(page.getByText('Ответ сохранён',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})
test('student print contains slides without notes, answers or interactive forms',async({page})=>{
 await page.emulateMedia({media:'print'});await page.goto(`./?mode=print&scope=${l.id}`);await expect(page.locator('.print-page')).toHaveCount(l.slides.length)
 await expect(page.locator('.print-page textarea:visible,.print-page input:visible,.print-page button:visible')).toHaveCount(0)
 await expect(page.locator('.print-page')).not.toContainText(['Проверочная локальная заметка'])
})

test('all four assessment types score taught answers on desktop',async({page})=>{
 const keys=JSON.parse(fs.readFileSync('public/assessment.json','utf8')).keys
 await page.setViewportSize({width:1366,height:900})
 for(const slide of l.slides.filter((s:{task?:unknown})=>s.task).slice(0,4)){
  const t=slide.task,k=keys[t.id];await page.goto(`./?lecture=${l.id}&slide=${slide.id}`)
  await page.getByRole('button',{name:'Проверить',exact:true}).click();await expect(page.locator('.task-status')).toHaveCount(0)
  if(t.type==='single'||t.type==='multiple'){
   for(const id of k.correct){const option=t.options.find((o:{id:string})=>o.id===id);await page.getByRole(t.type==='single'?'radio':'checkbox',{name:new RegExp(option.text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).check()}
  }else if(t.type==='short')await page.getByRole('textbox',{name:'Краткий ответ',exact:true}).fill(k.accepted[0])
  else for(const item of t.items)await page.getByRole('combobox',{name:`Соответствие: ${item.text}`,exact:true}).selectOption(k.pairs[item.id])
  await page.getByRole('button',{name:'Проверить',exact:true}).click();await expect(page.locator('.task-status')).toContainText('Правильно');await page.getByRole('button',{name:'Разбор ответа',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Правильный ответ')
 }
})
