import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {checkHeader,parseCsv,isCalendarDatetime,classifyRequests} from '../scripts/check-input.mjs';
const c=JSON.parse(fs.readFileSync('public/course.json','utf8'));
const n=JSON.parse(fs.readFileSync('public/teacher-notes.json','utf8')).notes;
const qs=JSON.parse(fs.readFileSync('authoring/questions.json','utf8'));
const redirects=JSON.parse(fs.readFileSync('public/slide-redirects.json','utf8'));
const selected=c.lectures;
describe('содержательная редакция всего курса',()=>{
 it.each(selected.map(l=>[l.id,l]))('%s покрывает исходные вопросы и самостоятельные случаи',(_,l)=>{
  const blocks=qs.filter(q=>q.lectureId===l.id);
  expect(blocks.flatMap(q=>q.sourceQuestionNumbers).sort((a,b)=>a-b)).toEqual([1,2,3,4,5,6,7,8]);
  for(const q of blocks){
   const s=l.slides.find(s=>s.task?.id===q.taskIds[0]);
   const index=l.slides.indexOf(s);
   expect(l.slides[index-1].id).toMatch(/-review$/);
   expect(n[s.id].script).not.toContain(n[s.id].answer);
   expect(n[s.id].answer.length).toBeGreaterThan(50);
   expect(l.slides.filter(s=>q.slideIds.includes(s.id)&&s.task).map(s=>s.task.type)).toEqual(['single','multiple','short','matching']);
   expect(l.slides.findIndex(s=>s.id===q.notebookId)).toBeLessThan(l.slides.findIndex(s=>s.id===q.evidenceSlideIds.find(id=>id.endsWith('-concept'))));
  }
 });
 it('сохраняет все 1495 прежних ссылок курса',()=>{
  expect(Object.keys(redirects)).toHaveLength(1495);
  const ids=new Set(c.lectures.flatMap(l=>l.slides.map(s=>s.id)));
  for(const target of Object.values(redirects))expect(ids.has(target)).toBe(true);
 });
 it('показывает фактические планы и различает оценку и измерение',()=>{
  const s=selected[9].slides.find(s=>s.id.endsWith('plans-result'));
  const plan=JSON.parse(fs.readFileSync('authoring/index-plan-example.json','utf8'));
  expect(s.rows).toContainEqual(['rows: оценка',String(plan.before.rowsEstimate),String(plan.after.rowsEstimate)]);
  expect(selected[9].slides.find(x=>x.id===s.id+'-walkthrough').body).toContain('не измеренные времена');
  const register=selected[9].slides.find(s=>s.id.endsWith('index-register-reasoning-1'));
  expect(register.body).toContain(String(plan.before.rowsEstimate));
 });
 it('удаляет проверки названия вопроса из выбранных тем',()=>{
  for(const l of selected)for(const s of l.slides.filter(s=>s.task))expect(s.task.prompt).not.toContain('Как называется вопрос');
 });
});
describe('календарь и классификация изменённого входа',()=>{
 it.each(['2026-02-30 10:00:00','2026-13-01 10:00:00','2026-01-01 24:00:00','0000-01-01 00:00:00','2026-01-01'])('отклоняет %s',value=>expect(isCalendarDatetime(value)).toBe(false));
 it.each(['2024-02-29 23:59:59','2026-02-28 00:00:00'])('принимает %s',value=>expect(isCalendarDatetime(value)).toBe(true));
 it('не теряет плохую дату, неизвестную деталь и повтор кода детали',()=>{
  const rows=[['R200','C01','B01','NEW','2026-02-30 10:00:00','P01'],['R201','C01','B01','NEW','2026-02-28 10:00:00','P09'],['R202','C01','B01','NEW','2026-02-28 10:00:00','P01;P01']];
  expect(classifyRequests(rows,{branches:['B01'],clients:['C01']}).map(x=>x.reason)).toEqual(['INVALID_DATETIME','INVALID_PART_LIST','INVALID_PART_LIST']);
 });
});
describe('проверка реального CSV',()=>{
 it('разбирает кавычки, запятую внутри значения и экранированные кавычки',()=>expect(parseCsv('code,name\nB01,"Сервис, север"\nB02,"Сервис ""А"""\n')).toEqual([['code','name'],['B01','Сервис, север'],['B02','Сервис "А"']]));
 it.each(['name,code\nA,B','code\nA','code,name,extra\nA,B,C'])('отклоняет изменённый заголовок %s',text=>expect(()=>checkHeader(text,['code','name'])).toThrow('Заголовок'));
 it('отклоняет повреждённую строку и незакрытые кавычки',()=>{expect(()=>checkHeader('code,name\nA,B,C',['code','name'])).toThrow('Строка');expect(()=>parseCsv('code,name\nA,"B')).toThrow('Незакрытые');});
 it.each(['code,name\nB01,"Сервис"X\n','code,name\nB01,Сер"вис\n','a\rb'])('не исправляет повреждённый CSV молча: %s',text=>expect(()=>parseCsv(text)).toThrow());
 it('сохраняет перевод строки внутри кавычек и пустое последнее поле',()=>expect(parseCsv('code,name\r\nB01,"Сервис\r\nСевер"\r\nB02,')).toEqual([['code','name'],['B01','Сервис\r\nСевер'],['B02','']]));
});
