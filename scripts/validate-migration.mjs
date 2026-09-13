import fs from 'node:fs';
import assert from 'node:assert/strict';
import {topics,course as originalCourse} from '../authoring/legacy-course.ts';
import {validateCourse,validateBank,validateTeacherPack,readiness,courseAssets} from '@olgakraven/lecture-engine';
const c=JSON.parse(fs.readFileSync('public/course.json','utf8'));
const bank=JSON.parse(fs.readFileSync('public/assessment.json','utf8'));
validateCourse(c);validateBank(bank,c);
assert.equal(c.lectures.length,topics.length);assert.equal(c.materialsUrl,originalCourse.materialsUrl);
const mapping=JSON.parse(fs.readFileSync('public/legacy-links.json','utf8'));
const registry=JSON.parse(fs.readFileSync('reports/registry.json','utf8'));
assert.equal(registry.reduce((n,l)=>n+l.lectureHours,0),38);
for(const original of topics){
 const lecture=c.lectures.find(l=>l.id===original.id);assert(lecture);
 assert.equal(lecture.title,original.displayTitle);assert.equal(lecture.sourceTitle,original.sourceTitle);assert.equal(lecture.semester,original.semester);
 const r=registry.find(l=>l.id===original.id);assert.equal(r.lectureHours,original.lectureHours);assert.deepEqual(r.competencies,original.competencies);assert.deepEqual(r.labNumbers,original.labNumbers);
 for(let n=1;n<=85;n++)assert(lecture.slides.some(s=>s.id===mapping[original.id][n]),`${original.id}: old slide ${n}`);
}
const bundled=JSON.parse(fs.readFileSync('public/teacher-notes.json','utf8'));
validateTeacherPack(bundled,c);
for(const l of c.lectures)for(const s of l.slides)if(!bundled.notes[s.id]?.script.trim())throw Error('Нет встроенного сценария: '+s.id);
const questions=JSON.parse(fs.readFileSync('authoring/questions.json','utf8'));
for(const l of c.lectures){
 if(l.slides.length<80)throw Error(l.id+': недостаточный объём');
 if(l.slides[0].kind!=='title'||l.slides.at(-1).kind!=='questions')throw Error('Границы лекции');
 for(const q of questions.filter(q=>q.lectureId===l.id)){
  const slides=l.slides.filter(s=>q.slideIds.includes(s.id));
  if(slides.filter(s=>s.visual).length<2)throw Error(q.questionId+': мало схем');
  if(slides.slice(-4).map(s=>s.task?.type).join()!=='single,multiple,short,matching')throw Error(q.questionId+': порядок тестов');
  if(!slides.some(s=>s.notebook)||!slides.some(s=>s.kind==='example'))throw Error(q.questionId+': нет примера/записи');
 }
}
for(const p of courseAssets(c))if(!/^https?:/.test(p)&&!fs.existsSync('public/'+p))throw Error('Нет ресурса '+p);
const warnings=readiness(c);if(warnings.length)throw Error(warnings.join('\n'));
if(process.argv.includes('--teacher')){
 const pack=JSON.parse(fs.readFileSync('private/teacher-pack.json','utf8'));validateTeacherPack(pack,c);
 const ids=c.lectures.flatMap(l=>l.slides.map(s=>s.id));
 if(Object.keys(pack.notes).length!==ids.length)throw Error('Лишние/недостающие заметки');
 for(const id of ids)if(!pack.notes[id]?.script.trim())throw Error('Нет заметки '+id);
}
console.log(JSON.stringify({lectures:c.lectures.length,slides:c.lectures.reduce((s,l)=>s+l.slides.length,0),questions:questions.length,tasks:Object.keys(bank.keys).length,teacherChecked:process.argv.includes('--teacher'),status:'passed'},null,2));
