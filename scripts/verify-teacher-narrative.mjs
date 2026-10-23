import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const i=process.argv.indexOf('--texts');
assert(i>=0,'Укажите --texts с каталогом канонических Markdown');
const dir=path.resolve(process.argv[i+1]);
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const courseBytes=fs.readFileSync('public/course.json'),course=JSON.parse(courseBytes),pack=read('public/teacher-notes.json'),learning=read('public/learning.json'),bank=read('public/assessment.json');
assert.equal(pack.contentVersion,course.contentVersion);
assert.equal(learning.contentVersion,course.contentVersion);
assert.equal(bank.contentVersion,course.contentVersion);
const records=[];let stages=0,variants=0,models=0,images=0,tasks=0;
for(const [li,l]of course.lectures.entries()){
 const base='lecture-'+String(li+1).padStart(2,'0');
 const text=fs.readFileSync(path.join(dir,base+'.teacher.md'),'utf8');
 const map=read(path.join(dir,base+'.alignment.json'));
 const exported=read(path.join(dir,'_support',base+'.teacher-pack.json'));
 assert.equal(map.sourceSha256,createHash('sha256').update(courseBytes).digest('hex'));
 assert.equal(map.contentVersion,course.contentVersion);
 assert.deepEqual(map.slides.map(s=>s.slideId),l.slides.map(s=>s.id));
 assert.equal([...text.matchAll(/<!-- source-slides: /g)].length,l.slides.length);
 for(const [si,s]of l.slides.entries()){
  const note=pack.notes[s.id];assert(note?.script.trim(),s.id);
  assert.deepEqual(exported.notes[s.id],note,s.id+': пакет расходится с панелью');
  const marker='<!-- source-slides: '+s.id+' -->';
  const start=text.indexOf(marker),end=text.indexOf('<a id="screen-',start);
  assert(start>=0,s.id+': нет раздела');
  const section=text.slice(start,end<0?undefined:end);
  assert(section.includes(note.script),s.id+': речь отсутствует в своём разделе');
  assert.equal(map.slides[si].displayNumber,si+1);
  assert(!note.script.includes('Рассмотрите исходные строки, поля и операцию'),s.id);
  if(note.notebook)assert.equal(note.notebook,s.notebook,s.id+': определение не соответствует экрану');
  if(s.task){
   tasks++;const key=bank.keys[s.task.id];assert(key,s.id);
   if(key.correct)for(const id of key.correct)assert(note.answer.includes(s.task.options.find(o=>o.id===id).text),s.id);
   if(key.accepted)for(const answer of key.accepted)assert(note.answer.includes(answer),s.id);
   if(key.pairs)for(const item of s.task.items)assert(note.answer.includes(item.text+' → '+s.task.options.find(o=>o.id===key.pairs[item.id]).text),s.id);
  }
  if(learning.lectureModels[s.id])models++;
  if(s.image)images++;
  const q=learning.questions.find(q=>q.passportId===s.id);
  if(q){
   assert(note.script.includes(q.case.data),s.id+': неверное условие кейса');
   assert(note.script.includes(q.case.question),s.id+': неверный вопрос кейса');
   for(const variant of q.case.practical.variants){
    variants++;assert(section.includes('### Условия: '+variant.label),s.id);
    for(const [step,stage]of variant.stages.entries()){
     stages++;assert(section.includes('#### Шаг '+step+'. '+stage.title),s.id);
     assert(section.includes(stage.explanation),s.id+': потерян шаг разбора');
     if(stage.sql)assert(section.includes(stage.sql),s.id+': потеряна команда');
    }
    for(const table of variant.stages[0].tables)assert(section.includes('**'+table.name+'**'),s.id+': нет исходной таблицы варианта');
   }
  }
  records.push({lectureId:l.id,slideId:s.id,displayNumber:si+1,teacherAnchor:map.slides[si].anchors.teacher,scriptSha256:createHash('sha256').update(note.script).digest('hex')});
 }
}
assert.equal(Object.keys(pack.notes).length,records.length);
const report={contentVersion:course.contentVersion,sourceSha256:createHash('sha256').update(courseBytes).digest('hex'),lectures:course.lectures.length,slides:records.length,questions:learning.questions.length,tasks,models,images,caseVariants:variants,caseStages:stages,checks:['ordered slide/Markdown alignment','panel/exported pack equality','script in its own Markdown section','definitions equal slide text','answers match current assessment keys','all practical variants and steps exported','generic example placeholders absent'],limits:'Semantic editorial review is separate from these structural checks. No SQL execution or classroom timing is certified by this script.',records};
fs.writeFileSync('reports/teacher-narrative-alignment.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,records:undefined},null,2));
