import fs from 'node:fs';
import {priorityContent} from './priority-content.mjs';
import {completePriority} from './priority-completeness.mjs';
import {earlyContent} from './content-01-03.mjs';
import {middleContent} from './content-04-05.mjs';
import {checkingContent} from './content-06-07.mjs';
import {accessContent} from './content-11.mjs';
import {finalContent} from './content-12-13.mjs';
completePriority(priorityContent);
Object.assign(priorityContent,earlyContent,middleContent,checkingContent,accessContent,finalContent);

export function rewritePriority({course,notes,keys,questions,registry,mapping,links}){
 const redirects={};
 for(const [lectureId,data] of Object.entries(priorityContent)){
  const lecture=course.lectures.find(l=>l.id===lectureId),old=lecture.slides,slides=[],phases={},manifest=[];
  const oldNotes={...notes};
  for(const s of old){delete notes[s.id];if(s.task)delete keys[s.task.id];}
  const add=(s,script,{answer='',questions:discussion='',seconds=60}={})=>{
   slides.push(s);notes[s.id]={script,preparation:data.preparation,notebook:s.notebook||'',questions:discussion,answer,estimatedSeconds:seconds};
  };
  const slide=(id,kind,title,fields={})=>({id:lectureId+'-'+id,kind,title,kicker:lecture.title,...fields});
  add(slide('title','title',lecture.title,{body:data.outcome}),data.introduction,{seconds:90});
  for(const s of old.filter(s=>s.kind==='literature'))add(s,'Источник для подготовки: '+s.references.map(r=>r.citation).join('; ')+'. Конкретные страницы выбирайте по доступному изданию; синтаксис примеров сверяйте с указанной версией MySQL.',{seconds:20});
  const materials=old.find(s=>s.kind==='materials');add(materials,'Для подготовки используйте согласованный учебный набор: три CSV, описание кодов, DDL, загрузку и контроль. Внешняя папка содержит дополнительные материалы; её меняющийся состав не является скрытым условием сегодняшнего разбора.',{seconds:25});
  add(slide('agenda','agenda','Вопросы темы'),'Сегодня последовательно разберём: '+data.blocks.map(b=>b.title).join('; ')+'. '+data.outcome,{seconds:45});
  const render=(id,w)=>slide(id,'example',w.title,w.image?{image:{...w.image,src:'data:image/png;base64,'+fs.readFileSync('public/'+w.image.src.replace(/\.svg$/,'.png')).toString('base64')}}:w.visual?{visual:w.visual}:w.code?{visual:{type:'codeParts',parts:[{code:w.code,label:w.title,explanation:w.language||'Учебный стенд MySQL 8.4'}],caption:'Проследите исходные условия, действие и полученный результат.'}}:{columns:w.columns,rows:w.rows});
  add(render('content-context',data.context),data.context.walkthrough,{seconds:100});
  for(const [i,w] of (data.contexts||[]).entries())add(render('content-context-'+(i+1),w),w.walkthrough,{seconds:100});
  for(const [bi,b] of data.blocks.entries()){
   const prefix='content-'+b.id;
   const start=slides.length;
   const section=slide(prefix+'-section','section',`${b.questionNumber}. ${b.title}`,{body:b.lead});
   add(section,b.lead,{seconds:30});
   const concept=slide(prefix+'-concept','theory',b.title,{bullets:b.mechanism,source:b.source});
   add(concept,b.mechanism.join(' '),{seconds:80,questions:b.discussion?.question||'',answer:b.discussion?.answer||''});
   const sentences=b.reasoning.split(/(?<=[.!?])\s+(?=[А-ЯЁA-Z«])/u);
   for(let si=0;si<sentences.length;si+=3){
    const text=sentences.slice(si,si+3).join(' ').trim();
    add(slide(prefix+'-reasoning-'+(si/3+1),'theory',si===0?'Почему это работает':'Продолжаем рассуждение',{body:text,source:b.source}),text,{seconds:90});
   }
   const worked=render(prefix+'-example',b.worked);worked.source=b.source;
   add(worked,b.worked.walkthrough,{seconds:180});
   for(const [i,w] of (b.results||[]).entries())add(render(prefix+'-result-step-'+(i+1),w),w.walkthrough,{seconds:100});
   if(lectureId==='s08-03-search-field-indexes'&&b.id==='plans'){
    const p=JSON.parse(fs.readFileSync('authoring/index-plan-example.json','utf8'));
    add(slide(prefix+'-result','example','Фактический план учебного опыта',{
     columns:['Показатель','До индекса','После индекса'],rows:[['type',p.before.type,p.after.type],['key',p.before.key,p.after.key],['rows: оценка',String(p.before.rowsEstimate),String(p.after.rowsEstimate)],['Extra',p.before.extra,p.after.extra]],source:'https://dev.mysql.com/doc/refman/8.4/en/explain-output.html'
    }),`На ${p.server} перед индексом выбран ALL: просмотр таблицы с оценкой ${p.before.rowsEstimate} строк и отдельной сортировкой. После индекса выбран ref, ключ ${p.after.key}, оценка ${p.after.rowsEstimate} строк. Реальных строк в таблице ${p.actualRows}, а условию соответствуют ${p.matchingRows}. Разница между ${p.before.rowsEstimate} и ${p.actualRows} показывает, почему rows нельзя читать как точное число. ${p.meaning}`,{seconds:150});
   }
   const taskId=lectureId+'-'+prefix+'-T01',spec=b.task;
   const task={id:taskId,type:spec.type,prompt:spec.prompt};
   let key={type:spec.type,explanation:spec.explanation};
   if(spec.options){task.options=spec.options.map((text,i)=>({id:'o'+(i+1),text}));}
   if(spec.type==='single')key.correct=['o'+(spec.correct+1)];
   if(spec.type==='multiple'){key.correct=spec.correct.map(i=>'o'+(i+1));task.choose=spec.correct.length;}
   if(spec.type==='short')key.accepted=spec.accepted;
   if(spec.type==='matching'){task.items=spec.items.map((text,i)=>({id:'i'+(i+1),text}));key.pairs=Object.fromEntries(spec.pairs.map((oi,i)=>['i'+(i+1),'o'+(oi+1)]));}
   if(task.options){const n=bi%task.options.length;task.options=[...task.options.slice(n),...task.options.slice(0,n)];}
   keys[taskId]=key;
   const test=slide(prefix+'-T01-slide','test','Самостоятельный случай',{task});
   const answer=spec.explanation+'\n'+(key.accepted?'Допустимый ответ: '+key.accepted.join(' / '):key.correct?'Верные варианты: '+key.correct.map(id=>task.options.find(o=>o.id===id).text).join('; '):'Соответствия: '+task.items.map(i=>i.text+' → '+task.options.find(o=>o.id===key.pairs[i.id]).text).join('; '));
   add(test,spec.prompt+'\nПауза: дайте группе сначала отправить ответ и обосновать его. До попытки решение не раскрываем. После ответа перейдём к следующему экрану с объяснением.',{seconds:120,questions:spec.prompt,answer});
   const review=slide(prefix+'-review','theory','Разбор самостоятельного случая',{body:spec.explanation});
   add(review,spec.explanation+' Показ: сопоставьте вывод с условием предыдущего экрана; обсудите, какое изменение исходных данных изменило бы ответ.',{seconds:90,answer});
   const notebook=slide(prefix+'-notebook','notebook','Запишите',{notebook:b.notebook});
   add(notebook,b.notebook+' '+(bi<data.blocks.length-1?'Теперь перейдём к вопросу «'+data.blocks[bi+1].title+'».':'Мы получили опоры для итогового вывода.'),{seconds:60});
   for(const qn of b.covers)phases[qn]={section:section.id,concept:concept.id,rule:concept.id,example:worked.id,practice:test.id,decision:review.id,warning:review.id,notebook:notebook.id,test:test.id};
   manifest.push({lectureId,questionId:lectureId+'-'+prefix,title:b.title,sourceQuestionNumbers:b.covers,slideIds:slides.slice(start).map(s=>s.id),taskIds:[taskId],evidenceSlideIds:[concept.id,worked.id],notebookId:notebook.id});
  }
  add(slide('content-summary','summary','От условий к обоснованному решению',{bullets:data.blocks.map(b=>b.notebook)}),data.blocks.map(b=>b.notebook).join(' ')+' Вернёмся к исходному результату: '+data.outcome,{seconds:100});
  add(slide('questions','questions','Вопросы от аудитории',{body:'Назовите условие, которое изменит одно из сегодняшних решений. Объясните, какую проверку потребуется повторить.'}),'Выберите одно из решений занятия и измените существенное условие. В ответе назовите исходный факт, изменившееся условие, ожидаемый эффект и способ проверки. Если вопрос требует неизвестных данных, зафиксируем их как ограничение вывода.',{seconds:90});
  const ids=new Set(slides.map(s=>s.id));
  for(const s of old){
   if(ids.has(s.id)){redirects[s.id]=s.id;continue;}
   const m=s.id.match(/-q(\d+)-(.*)$/);
   const target=m?phases[Number(m[1])]?.[m[2].startsWith('T')?'test':m[2]]:undefined;
   redirects[s.id]=target||slides.find(s=>s.id===''+lectureId+'-content-context').id;
  }
  for(const [oldNumber,id] of Object.entries(links[lectureId]))links[lectureId][oldNumber]=redirects[id]||id;
  for(const entry of mapping.filter(m=>m.lectureId===lectureId))entry.newSlideIds=[...new Set(entry.newSlideIds.map(id=>redirects[id]||id))];
   for(const g of course.glossary||[])g.slideIds=[...new Set(g.slideIds.map(id=>redirects[id]||id))];
  for(const id of Object.keys(questions).filter(i=>questions[i].lectureId===lectureId).sort((a,b)=>b-a))questions.splice(Number(id),1);
  questions.push(...manifest);lecture.slides=slides;lecture.question=data.outcome;
  const cur=course.curriculum.find(x=>x.topic===lecture.sourceTitle);
  cur.slideIds=slides.filter(s=>!s.task).map(s=>s.id);cur.taskIds=manifest.flatMap(q=>q.taskIds);
  const r=registry.find(r=>r.id===lectureId);Object.assign(r,{slides:slides.length,questions:data.blocks.length,tasks:manifest.length,estimatedMinutes:Math.round(slides.reduce((sum,s)=>sum+notes[s.id].estimatedSeconds,0)/60),contentReview:'2026-10-22'});
 }
 fs.writeFileSync('public/slide-redirects.json',JSON.stringify(redirects,null,2)+'\n');
 return redirects;
}
