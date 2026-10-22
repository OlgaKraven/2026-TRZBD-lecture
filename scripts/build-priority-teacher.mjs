import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const i=process.argv.indexOf('--out');if(i<0)throw Error('Укажите --out для папки преподавательских Markdown в BrainM');
const out=path.resolve(process.argv[i+1]);fs.mkdirSync(out,{recursive:true});
const bytes=fs.readFileSync('public/course.json'),c=JSON.parse(bytes),p=JSON.parse(fs.readFileSync('public/teacher-notes.json','utf8'));
const sha=createHash('sha256').update(bytes).digest('hex');
const routes=[];
for(const [index,l] of c.lectures.entries()){
 if(index<7||index>9)continue;
 const number=String(index+1).padStart(2,'0'),base='lecture-'+number;
 const header=`---\ncourse: ${c.id}\nlectureId: ${l.id}\ncontentVersion: ${c.contentVersion}\nsourceKind: local\nsourceSha256: ${sha}\nscope: full-lecture\n---\n\n# ${index+1}. ${l.title}\n\n`;
 const main=l.slides.filter(s=>!s.id.includes('-reasoning-'));
 const extra=l.slides.filter(s=>s.id.includes('-reasoning-'));
 const minutes=slides=>Math.round(slides.reduce((sum,s)=>sum+p.notes[s.id].estimatedSeconds,0)/60);
 routes.push({lectureId:l.id,coreSlideIds:main.map(s=>s.id),readingSlideIds:extra.map(s=>s.id),coreEstimatedMinutes:minutes(main),fullEstimatedMinutes:minutes(l.slides),timing:'estimate, not classroom measurement'});
 const route=`Основной маршрут: около ${minutes(main)} минут по оценке сценария, без отдельного чтения вслух экранов «Почему это работает / Продолжаем рассуждение». Они сохранены для развёрнутой подготовки и самостоятельного чтения. При полном последовательном показе ориентир — ${minutes(l.slides)} минут. Это оценка, не проведённый хронометраж. Основной маршрут сохраняет все восемь вопросов, разобранные примеры, попытку и разбор.\n\n`;
 let teacher=header+route+'Текст следует фактическому порядку экранов. В самостоятельном случае сначала дано условие; ответ расположен после него в отдельном преподавательском разборе.\n\n';
 let presenter=header+route;
 const alignment={schemaVersion:1,courseId:c.id,contentVersion:c.contentVersion,sourceKind:'local',sourceSha256:sha,lectureIds:[l.id],documents:{teacher:base+'.teacher.md',presenter:base+'.presenter.md'},slides:[]};
 const notes={};
 for(const [si,s] of l.slides.entries()){
  const n=p.notes[s.id],anchor='screen-'+String(si+1).padStart(3,'0');
  teacher+=`<a id="${anchor}"></a>\n## Слайд ${si+1}. ${s.title}\n<!-- source-slides: ${s.id} -->\n\n${n.script}\n\n`;
  if(s.task)teacher+=`### Для преподавателя: после самостоятельной попытки\n\n${n.answer}\n\n`;
  presenter+=`<a id="${anchor}"></a>\n## Слайд ${si+1}. ${s.title}\n\nID: \`${s.id}\`\n\n${n.script}\n\n`;
  if(n.questions)presenter+=`**Вопрос группе:** ${n.questions}\n\n`;
  if(n.answer)presenter+=`**Ожидаемый ответ и разбор:** ${n.answer}\n\n`;
  if(n.notebook)presenter+=`**Запись в тетрадь:** ${n.notebook}\n\n`;
  alignment.slides.push({lectureId:l.id,slideId:s.id,displayNumber:si+1,title:s.title,anchors:{teacher:anchor,presenter:anchor}});notes[s.id]=n;
 }
 fs.writeFileSync(path.join(out,base+'.teacher.md'),teacher);fs.writeFileSync(path.join(out,base+'.presenter.md'),presenter);
 fs.writeFileSync(path.join(out,base+'.alignment.json'),JSON.stringify(alignment,null,2)+'\n');
 fs.writeFileSync(path.join(out,base+'.teacher-pack.json'),JSON.stringify({...p,notes},null,2)+'\n');
}
fs.writeFileSync('reports/teaching-routes.json',JSON.stringify(routes,null,2)+'\n');
console.log(JSON.stringify({sourceSha256:sha,lectures:routes.map(r=>({id:r.lectureId,coreMinutes:r.coreEstimatedMinutes,fullMinutes:r.fullEstimatedMinutes,slides:r.coreSlideIds.length+r.readingSlideIds.length}))},null,2));
