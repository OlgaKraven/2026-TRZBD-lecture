import fs from 'node:fs';
import {topics} from './legacy-course.ts';
import {practiceDetails} from './practice-details.mjs';
export function restoreTeaching(course,notes,questions,keys,registry,links,mapping){
 const learning=JSON.parse(fs.readFileSync('public/learning.json','utf8'));
 const redirects=JSON.parse(fs.readFileSync('public/slide-redirects.json','utf8'));
 for(const [li,l] of course.lectures.entries()){
  const source=topics.find(t=>t.id===l.id),qs=questions.filter(q=>q.lectureId===l.id);
  const agenda=l.slides.find(s=>s.kind==='agenda');
  agenda.steps=source.questions.map((q,i)=>({title:String(i+1).padStart(2,'0'),text:q.title}));
  notes[agenda.id].script='Разберём вопросы темы в исходном порядке: '+source.questions.map((q,i)=>(i+1)+'. '+q.title).join('; ')+'. Объяснения и примеры последовательно раскрывают каждый вопрос.';
  const materials=l.slides.find(s=>s.kind==='materials');notes[materials.id].script+=' Материалы доступны по адресу '+course.materialsUrl+'. QR-код открывает ту же ссылку.';
  for(const [qi,q] of qs.entries()){
   const item=learning.questions.find(x=>x.id===q.questionId),detail=practiceDetails[li][qi];
   q.title=source.questions[qi].title;item.title=q.title;
   l.slides.find(s=>s.kind==='section'&&q.slideIds.includes(s.id)).title=(qi+1)+'. '+q.title;
   const notebook=l.slides.find(s=>s.id===q.notebookId),section=l.slides.find(s=>s.kind==='section'&&q.slideIds.includes(s.id));
   // Definition before mechanism, worked example and independent work; keep every rule.
   l.slides.splice(l.slides.indexOf(notebook),1);l.slides.splice(l.slides.indexOf(section)+1,0,notebook);
   notes[notebook.id].script='Запишем определение '+(qi+1)+'. '+notebook.notebook+' На этом основании далее рассмотрим механизм и проверим его на конкретных данных.';
   const original=l.slides.find(s=>s.task?.id===q.taskIds[0]);
   const firstPairs=[
    ['Контрольная сумма файла','Идентификация конкретных байтов источника'],
    ['Правило предметной области','Основание допустимой функциональной зависимости'],
    ['schema.table','Квалифицированное имя объекта'],
    ['SHOW CREATE TABLE','Фактическое определение выбранной таблицы'],
    ['Количество полей записи','Соответствие структуры строки заголовку'],
    ['WHERE','Ограничение области подсчёта строк'],
    ['Гранулярность','Смысл одной строки результата'],
    ['Базовая таблица','Источник фактов для вычисления VIEW'],
    ['ROLLBACK','Отмена неподтверждённых изменений транзакции'],
    ['Индекс','Поддерживаемая структура доступа по ключевым значениям'],
    ['Объект доступа','Таблица или VIEW, которыми ограничена привилегия'],
    ['DEFINER','Владелец определения программного объекта'],
    ['Версия комплекта','Согласованный состав передаваемых артефактов']
   ];
   // Three current correspondences plus one distinct prerequisite already studied.
   // Do not create two interchangeable NULL/definition answers in the same matching task.
   const extra=qi?practiceDetails[li][qi-1].pairs.find(p=>!detail.pairs.some(d=>d[0]===p[0]||d[1]===p[1])):firstPairs[li];
   if(!extra)throw Error('No distinct prerequisite correspondence: '+q.questionId);
   const c=item.case,shift=(qi+1)%3,pairs=[...detail.pairs.slice(shift),...detail.pairs.slice(0,shift),extra];
   const alternative=learning.questions.filter(x=>x.case.lectureId===l.id).map(x=>x.definition.term).find(term=>!pairs.some(p=>p[0]===term))||'Протокол испытания';
   const specs={
    single:{prompt:'Какой объект или действие соответствует признаку «'+pairs[0][1]+'»?',options:[...pairs.slice(0,3).map(p=>p[0]),alternative],correct:0,explanation:pairs.map(p=>p.join(' — ')).join('; ')+'.'},
    multiple:{prompt:c.data+' Выберите два обоснованных положения или действия.',options:[c.options[c.correct],c.reason.split(/(?<=[.!?])\s+/u)[0],...c.options.filter((_,i)=>i!==c.correct),source.questions[qi].pitfall],correct:[0,1],explanation:c.reason+' Остальные варианты меняют условие или не обеспечивают требуемого свойства.'},
    short:{prompt:detail.prompt,accepted:detail.accepted,explanation:'Ответ: '+detail.accepted[0]+'. '+item.rule},
    matching:{prompt:'Установите предметные соответствия. Каждое значение справа используется один раз.',items:pairs.map(p=>p[0]),options:pairs.map(p=>p[1]),pairs:[0,1,2,3],explanation:pairs.map(p=>p.join(' → ')).join('; ')+'.'}
   };
   const slides=[original];let sequence=2;
   for(const type of ['single','multiple','short','matching']){
    if(original.task.type===type)continue;
    const spec=specs[type],taskId=q.questionId+'-T0'+sequence++,task={id:taskId,type,prompt:spec.prompt};
    const key={type,explanation:spec.explanation};
    if(spec.options)task.options=spec.options.map((text,i)=>({id:'o'+(i+1),text}));
    if(type==='single')key.correct=['o1'];
    if(type==='multiple'){key.correct=spec.correct.map(i=>'o'+(i+1));task.choose=2;}
    if(type==='short')key.accepted=spec.accepted;
    if(type==='matching'){task.items=spec.items.map((text,i)=>({id:'i'+(i+1),text}));key.pairs=Object.fromEntries(spec.pairs.map((n,i)=>['i'+(i+1),'o'+(n+1)]));}
    if(task.options){const n=(li+qi+sequence)%task.options.length;task.options=[...task.options.slice(n),...task.options.slice(0,n)];}
    const slide={id:taskId+'-slide',kind:'test',title:'Самопроверка',kicker:l.title,task};keys[taskId]=key;
    const solution=key.correct?'Верные варианты: '+key.correct.map(id=>task.options.find(o=>o.id===id).text).join('; '):key.accepted?'Допустимый ответ: '+key.accepted.join(' / '):'Соответствия: '+task.items.map(i=>i.text+' → '+task.options.find(o=>o.id===key.pairs[i.id]).text).join('; ');
    notes[slide.id]={...notes[original.id],script:spec.prompt+' Сначала дайте самостоятельный ответ и обоснуйте его. Разбор откроем после попытки.',questions:spec.prompt,notebook:'',answer:solution+'\n'+spec.explanation,estimatedSeconds:type==='matching'?120:90};
    slides.push(slide);
   }
   const order=['single','multiple','short','matching'];slides.sort((a,b)=>order.indexOf(a.task.type)-order.indexOf(b.task.type));
   for(const [i,s] of slides.entries())s.title=['Самопроверка: один ответ','Самопроверка: несколько ответов','Самопроверка: короткий ответ','Самопроверка: соответствия'][i];
   const insert=l.slides.indexOf(original);l.slides.splice(insert,1,...slides);
   q.taskIds=slides.map(s=>s.task.id);q.slideIds=l.slides.filter(s=>q.slideIds.includes(s.id)||slides.includes(s)).map(s=>s.id);
   item.testId=slides[0].id;item.testIds=slides.map(s=>s.id);item.slideIds=q.slideIds;
   for(const s of slides)learning.slides[s.id]={questionId:q.questionId,number:qi+1};
  }
  for(const s of l.slides){
   if(s.task?.type==='short'){
    const original=s.task.prompt,normalize=s=>s.trim().toLocaleLowerCase('ru').replace(/\s+/g,' ');
    s.task.prompt=original.replace(/\s*Ответьте(?:\s+(?:словами|одним словом))?\s*«([^»]+)»[.!]?/gu,(all,value)=>keys[s.task.id].accepted.some(answer=>normalize(answer)===normalize(value))?'':all).trim();
    notes[s.id].script=notes[s.id].script.replace(original,s.task.prompt);notes[s.id].questions=s.task.prompt;
   }
   if(s.kind==='section'){const q=qs.find(q=>q.slideIds.includes(s.id));notes[s.id].script='Вопрос '+q.sourceQuestionNumbers[0]+'. '+q.title+'. '+notes[s.id].script;}
   if(s.visual?.type==='codeParts')notes[s.id].script+='\n\nПоказ: начните с обзора кода, затем включите «Показать». Остановитесь на проверке условия; вернитесь к нужной строке кнопкой «Назад» и сопоставьте её с результатом.';
   else if(s.rows)notes[s.id].script+='\n\nПоказ: сначала рассмотрите всю таблицу, затем выделяйте строки по шагам. Пауза нужна для сопоставления значений в одной строке и проверки основания вывода.';
   else if(s.image)notes[s.id].script+='\n\nПоказ: последовательно рассмотрите таблицы и атрибуты, ключи PK/FK, затем концы связей и кратность. Кнопки шага сохраняют структуру и помогают вернуться к нужному свойству.';
  }
  // Match the approved two-reference cards per page; preserve all citations and old links.
  for(const group of ['primary','additional']){
   const old=l.slides.filter(s=>s.kind==='literature'&&s.readingGroup===group),refs=old.flatMap(s=>s.references),rebuilt=[];
   for(let i=0;i<refs.length;i+=2){const page={...old[i],title:group==='primary'?'Основная литература':'Дополнительная литература',references:refs.slice(i,i+2)};rebuilt.push(page);
    notes[page.id].script='Для подготовки к теме используем '+page.references.map(r=>r.citation.split(/\s\/\s/)[0]).join('; ')+'. QR-коды и ссылки открывают карточки изданий. Нужные разделы выбирайте по доступному изданию; номера страниц здесь не назначаем.';
    for(const removed of old.slice(i+1,i+2)){redirects[removed.id]=page.id;delete notes[removed.id];}
   }
   const at=l.slides.findIndex(s=>s===old[0]);l.slides=l.slides.filter(s=>!old.includes(s));l.slides.splice(at,0,...rebuilt);
  }
  for(const [id,target] of Object.entries(redirects))if(redirects[target]&&redirects[target]!==target)redirects[id]=redirects[target];
  for(const [n,id] of Object.entries(links[l.id]))links[l.id][n]=redirects[id]||id;
  const curriculum=course.curriculum.find(x=>x.topic===l.sourceTitle);curriculum.slideIds=l.slides.filter(s=>!s.task).map(s=>s.id);curriculum.taskIds=qs.flatMap(q=>q.taskIds);
  const r=registry.find(r=>r.id===l.id);Object.assign(r,{slides:l.slides.length,tasks:qs.flatMap(q=>q.taskIds).length,contentReview:'2026-10-23',estimatedMinutes:Math.round(l.slides.reduce((n,s)=>n+notes[s.id].estimatedSeconds,0)/60)});
 }
 for(const m of mapping)m.newSlideIds=[...new Set(m.newSlideIds.map(id=>redirects[id]||id))];
 fs.writeFileSync('public/learning.json',JSON.stringify(learning,null,2)+'\n');fs.writeFileSync('public/slide-redirects.json',JSON.stringify(redirects,null,2)+'\n');
}
