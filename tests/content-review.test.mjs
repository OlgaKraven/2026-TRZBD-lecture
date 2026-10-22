import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {checkHeader,parseCsv} from '../scripts/check-input.mjs';
const c=JSON.parse(fs.readFileSync('public/course.json','utf8'));
const n=JSON.parse(fs.readFileSync('public/teacher-notes.json','utf8')).notes;
const qs=JSON.parse(fs.readFileSync('authoring/questions.json','utf8'));
const redirects=JSON.parse(fs.readFileSync('public/slide-redirects.json','utf8'));
const selected=c.lectures.slice(7,10);
describe('содержательная редакция лекций 8–10',()=>{
 it.each(selected.map(l=>[l.id,l]))('%s покрывает исходные вопросы и самостоятельные случаи',(_,l)=>{
  const blocks=qs.filter(q=>q.lectureId===l.id);
  expect(blocks.flatMap(q=>q.sourceQuestionNumbers).sort((a,b)=>a-b)).toEqual([1,2,3,4,5,6,7,8]);
  for(const q of blocks){
   const s=l.slides.find(s=>s.id===q.slideIds.find(id=>id.endsWith('T01-slide')));
   const index=l.slides.indexOf(s);
   expect(l.slides[index+1].id).toMatch(/-review$/);
   expect(n[s.id].script).not.toContain(n[s.id].answer);
   expect(n[s.id].answer.length).toBeGreaterThan(50);
  }
 });
 it('сохраняет все 345 прежних ссылок выбранных лекций',()=>{
  expect(Object.keys(redirects)).toHaveLength(345);
  const ids=new Set(c.lectures.flatMap(l=>l.slides.map(s=>s.id)));
  for(const target of Object.values(redirects))expect(ids.has(target)).toBe(true);
 });
 it('показывает фактические планы и различает оценку и измерение',()=>{
  const s=selected[2].slides.find(s=>s.id.endsWith('plans-result'));
  expect(s.rows).toContainEqual(['rows: оценка','10093','33']);
  expect(n[s.id].script).toContain('не измеренные времена');
 });
 it('удаляет проверки названия вопроса из выбранных тем',()=>{
  for(const l of selected)for(const s of l.slides.filter(s=>s.task))expect(s.task.prompt).not.toContain('Как называется вопрос');
 });
});
describe('проверка реального CSV',()=>{
 it('разбирает кавычки, запятую внутри значения и экранированные кавычки',()=>expect(parseCsv('code,name\nB01,"Сервис, север"\nB02,"Сервис ""А"""\n')).toEqual([['code','name'],['B01','Сервис, север'],['B02','Сервис "А"']]));
 it.each(['name,code\nA,B','code\nA','code,name,extra\nA,B,C'])('отклоняет изменённый заголовок %s',text=>expect(()=>checkHeader(text,['code','name'])).toThrow('Заголовок'));
 it('отклоняет повреждённую строку и незакрытые кавычки',()=>{expect(()=>checkHeader('code,name\nA,B,C',['code','name'])).toThrow('Строка');expect(()=>parseCsv('code,name\nA,"B')).toThrow('Незакрытые');});
});
