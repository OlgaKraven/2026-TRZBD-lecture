import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const i=process.argv.indexOf('--out');if(i<0)throw Error('Укажите --out для папки преподавательских Markdown в BrainM');
const out=path.resolve(process.argv[i+1]);fs.mkdirSync(out,{recursive:true});
const bytes=fs.readFileSync('public/course.json'),c=JSON.parse(bytes),p=JSON.parse(fs.readFileSync('public/teacher-notes.json','utf8'));
const sha=createHash('sha256').update(bytes).digest('hex');
const support=path.join(out,'_support');fs.mkdirSync(support,{recursive:true});
const routes=[];
for(const [index,l] of c.lectures.entries()){
 if(!process.argv.includes('--all')&&(index<7||index>9))continue;
 const number=String(index+1).padStart(2,'0'),base='lecture-'+number;
 const header=`# ${index+1}. ${l.title}\n\n`;
 const minutes=slides=>Math.round(slides.reduce((sum,s)=>sum+p.notes[s.id].estimatedSeconds,0)/60);
 const supplementary=l.slides.filter(s=>s.id.endsWith('-review'));
 routes.push({lectureId:l.id,slideIds:l.slides.map(s=>s.id),estimatedMinutes:minutes(l.slides),explanationAndMainTasksMinutes:minutes(l.slides.filter(s=>!supplementary.includes(s))),independentSupplementsMinutes:minutes(supplementary),timing:'word-count and action-based rough estimate; supplements can be studied independently; not classroom measurement or approved timetable'});
 const route='Текст сохраняет все вопросы и объяснения в порядке показа. На самостоятельных случаях сначала дайте группе ответить, затем откройте преподавательский разбор. Дополнения по кнопке «Интерактивная схема» пригодны и для самостоятельной работы после общего объяснения; при выполнении в аудитории им нужно отдельное время. Фактический темп зависит от обсуждения и демонстраций; время полей панели — предварительная оценка речи и действий, а не утверждённый хронометраж занятия.\n\n';
 let teacher=header+route+'Текст следует фактическому порядку экранов. В самостоятельном случае сначала дано условие; ответ расположен после него в отдельном преподавательском разборе.\n\n';
 const preparation=[...new Set(l.slides.map(s=>p.notes[s.id].preparation).filter(Boolean))];
 teacher+='## Подготовка к занятию\n\n'+preparation.join('\n\n')+'\n\n';
 const alignment={schemaVersion:1,courseId:c.id,contentVersion:c.contentVersion,sourceKind:'local',sourceSha256:sha,lectureIds:[l.id],documents:{teacher:base+'.teacher.md'},slides:[]};
 const notes={};
 for(const [si,s] of l.slides.entries()){
  const n=p.notes[s.id],anchor='screen-'+String(si+1).padStart(3,'0');
  teacher+=`<a id="${anchor}"></a>\n## Слайд ${si+1}. ${s.title}\n<!-- source-slides: ${s.id} -->\n\n`;
  if(s.rows&&s.columns){
   const cell=v=>String(v).replaceAll('|','\\|').replaceAll('\n','<br>');
   teacher+='| '+s.columns.map(cell).join(' | ')+' |\n| '+s.columns.map(()=>'---').join(' | ')+' |\n'+s.rows.map(row=>'| '+row.map(cell).join(' | ')+' |').join('\n')+'\n\n';
  }
  if(s.visual?.type==='codeParts')for(const part of s.visual.parts)teacher+='```'+(/^(node|mysqldump)/.test(part.code)?'text':'sql')+'\n'+part.code+'\n```\n\n';
  if(s.image?.src.startsWith('data:image/png;base64,')){
   const bytes=Buffer.from(s.image.src.split(',')[1],'base64'),name='image-'+createHash('sha256').update(bytes).digest('hex').slice(0,12)+'.png';
   fs.writeFileSync(path.join(support,name),bytes);
   teacher+=`![${s.image.alt}](_support/${name})\n\n`;
  }
  teacher+=n.script+'\n\n';
  if(n.questions&&n.questions!==s.task?.prompt)teacher+=`**Вопрос группе:** ${n.questions}\n\n`;
  if(n.answer)teacher+=`### ${s.task?'Для преподавателя: после самостоятельной попытки':'Ожидаемый ответ и разбор'}\n\n${n.answer}\n\n`;
  if(n.notebook&&!n.script.includes(n.notebook))teacher+=`**Запись в тетрадь:** ${n.notebook}\n\n`;
  alignment.slides.push({lectureId:l.id,slideId:s.id,displayNumber:si+1,title:s.title,anchors:{teacher:anchor}});notes[s.id]=n;
 }
 fs.writeFileSync(path.join(out,base+'.teacher.md'),teacher.trimEnd()+'\n');
 fs.writeFileSync(path.join(out,base+'.alignment.json'),JSON.stringify(alignment,null,2)+'\n');
 fs.writeFileSync(path.join(support,base+'.teacher-pack.json'),JSON.stringify({...p,notes},null,2)+'\n');
 for(const suffix of ['.presenter.md','.teacher-pack.json']){
  const obsolete=path.join(out,base+suffix);if(fs.existsSync(obsolete))fs.unlinkSync(obsolete);
 }
 const oldMap=path.join(support,base+'.alignment.json');if(fs.existsSync(oldMap))fs.unlinkSync(oldMap);
}
fs.writeFileSync('reports/teaching-routes.json',JSON.stringify(routes,null,2)+'\n');
console.log(JSON.stringify({sourceSha256:sha,lectures:routes.map(r=>({id:r.lectureId,slides:r.slideIds.length})),documents:'one teacher.md per lecture'},null,2));
