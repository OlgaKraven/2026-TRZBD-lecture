import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {learningContent} from './learning-content.mjs';
import {caseModel} from './database-cases.mjs';
import {courseMaps} from './course-maps.mjs';
export function enrichLearning(course,notes,questions,keys,registry){
 const learning={schemaVersion:1,contentVersion:course.contentVersion,questions:[],slides:{},lectureModels:{}};
 const glossary=new Map();
 for(const [li,l] of course.lectures.entries()){
  const map=courseMaps[li],mapId=l.id+'-content-database-map';
  const {walkthrough,...publicMap}=map;
  learning.lectureModels[mapId]=publicMap;
  const context=l.slides.findIndex(s=>s.id.endsWith('-context'));
  l.slides.splice(context+1,0,{id:mapId,kind:'theory',kicker:'Схема данных',title:map.title,body:map.meaning});
  const contextNote=notes[l.slides[context].id];
  notes[mapId]={...contextNote,script:walkthrough,questions:'Какой объект и какое свойство связывает каждая линия этой схемы?',answer:map.links.map(l=>l.label).join('. '),notebook:'',estimatedSeconds:120};
  const qs=questions.filter(q=>q.lectureId===l.id);
  if(qs.length!==8||learningContent[li]?.length!==8)throw Error('Missing authored learning content: '+l.id);
  for(const [qi,q] of qs.entries()){
   const [definition,activity]=learningContent[li][qi];
   const notebook=l.slides.find(s=>s.id===q.notebookId);
   const rule=notebook.notebook;
   notebook.notebook=definition.term+' — '+definition.definition+'\n\nПравило и проверка: '+rule;
   notes[notebook.id].notebook=notebook.notebook;
   notes[notebook.id].script=definition.term+' — '+definition.definition+' '+notes[notebook.id].script;
   const test=l.slides.find(s=>s.task?.id===q.taskIds[0]);
   const passport=l.slides.find(s=>s.id.endsWith('-review')&&q.slideIds.includes(s.id));
   const previousReview={...notes[passport.id]};
   const id=q.questionId;
   const model=caseModel(li,qi);
   const inspect=model.trace[1];
   const caseData={...activity,inspect,model,id,revision:createHash('sha256').update(JSON.stringify({...activity,inspect,model})).digest('hex').slice(0,12),title:definition.term,lectureId:l.id,passportId:passport.id};
   passport.title=definition.term+': самостоятельное исследование';
   passport.body=activity.data;
   notes[passport.id].script='Рассмотрим другой набор данных для этого правила. '+activity.data+' '+activity.question+' Покажите схему '+model.tables.map(t=>t.name).join(' → ')+'. '+model.trace[0]+' Попросите группу зафиксировать прогноз. Откройте «Разбор кейса» в этом окне; в режиме показа схема и шаги появятся у аудитории. На этапе проверки разберите конкретные поля и условие операции: '+model.trace[1]+' Ответ группы сопоставьте с данными после попытки, затем отдельно разрешите показ разбора аудитории.';
   notes[passport.id].questions=activity.question;
   const scenarioTeaching={
    's07-07-control-queries-content-joins':'В предметной модели сначала покажите две пары INNER JOIN. Затем выберите LEFT JOIN, повторите шаги и найдите добавленную C9–NULL. Меняется оператор сравнения, но исходный вопрос по-прежнему относится к INNER JOIN.',
    's07-07-control-queries-content-outer':"Сначала доведите вариант WHERE до полного результата: B4–R4, без B5. Перенесите условие r.status='WORK' в ON выбором варианта и повторите шаги: теперь B5 сохраняется с правым NULL. Покажите, на каком этапе применяется фильтр; исходный ответ относится к WHERE.",
    's07-07-control-queries-content-aggregate':'Сначала получите для пустого B5 COUNT(*)=1 и COUNT(r.id)=0. Выберите вариант с реальной заявкой R5: она появляется в исходной таблице. Повторите шаги и сравните: COUNT(*) остаётся 1, COUNT(r.id) становится 1. Это изменённое условие, исходный вопрос относится к филиалу без заявок.'
   };
   if(scenarioTeaching[id])notes[passport.id].script+=' '+scenarioTeaching[id];
   notes[passport.id].answer='Для самостоятельного дополнения: '+activity.options[activity.correct]+'. '+activity.reason+' '+model.trace[2];
   notes[test.id].answer+='\nРазбор исходного самостоятельного случая: '+previousReview.script;
   notes[test.id].script=notes[test.id].script.replace('После ответа перейдём к следующему экрану с объяснением.','После попытки откройте разбор ответа и сопоставьте его с обоснованием группы.');
   if(li===7&&qi===0){
    const mechanism=l.slides.find(s=>q.slideIds.includes(s.id)&&s.id.endsWith('-concept'));
    notes[mechanism.id].script+=' Видимость определяет транзакция чтения, а не имя VIEW. Обычный SELECT InnoDB при REPEATABLE READ читает снимок первого согласованного чтения этой транзакции и собственные изменения; чужой поздний COMMIT не обновляет такой снимок. В новой транзакции снимок формируется заново. В независимом кейсе явно задана новая транзакция после изменения Q9, поэтому там видна CLOSED. Мы не вводим здесь все уровни изоляции, но не обещаем, что любое повторное чтение VIEW немедленно увидит чужие изменения.';
   }
   const oldIndex=l.slides.indexOf(passport);l.slides.splice(oldIndex,1);l.slides.splice(l.slides.indexOf(test),0,passport);
   q.slideIds=l.slides.filter(s=>q.slideIds.includes(s.id)).map(s=>s.id);
   const item={id,number:qi+1,title:q.title,definition,rule,case:caseData,passportId:passport.id,testId:test.id,slideIds:q.slideIds};
   learning.questions.push(item);
   for(const sid of q.slideIds)learning.slides[sid]={questionId:id,number:qi+1};
   const g=glossary.get(definition.term)||{term:definition.term,definition:definition.definition,slideIds:[]};
   g.slideIds.push(notebook.id);glossary.set(g.term,g);
   // Content-based estimates include reading, working the example and an independent attempt.
   for(const sid of q.slideIds){const s=l.slides.find(s=>s.id===sid),n=notes[sid];
    const words=n.script.split(/\s+/).length;
    n.estimatedSeconds=Math.ceil(words/1.8)+(sid===passport.id?180:s.task?120:s.visual?.type==='codeParts'?120:s.rows?75:s.kind==='notebook'?45:30);
   }
  }
  const conclusions={
   's08-01-views':[
    'VIEW хранит запрос; результат зависит от доступного состояния исходных данных.',
    'Контракт фиксирует колонки и смысл одной строки результата.',
    'Пустой контрольный результат относится только к проверенному условию.',
    'LEFT JOIN и COUNT правого ключа сохраняют пустой филиал с нулём.',
    'Кратность дочерних связей проверяют до суммирования.',
    'DEFINER и INVOKER задают разный контекст проверки прав.',
    'Право на VIEW не устраняет ограничения его обновляемости.',
    'Реестр связывает определение, потребителя и испытанный контракт.'
   ],
   's08-02-coordinated-data-changes':[
    'Одна бизнес-операция требует совместного подтверждения связанных фактов.',
    'Транзакционные границы принадлежат конкретной сессии.',
    'До COMMIT проверяют весь результат; после него нужна новая бизнес-операция.',
    'Ошибка оператора не заменяет явный откат всей операции.',
    'Процедура задаёт входы, проверки и владельца транзакции.',
    'SIGNAL сообщает отказ; обработчик обеспечивает согласованное завершение.',
    'Изменение InnoDB и вызванный им аудит откатываются вместе.',
    'Матрица испытаний сравнивает все связанные эффекты успеха и отказа.'
   ],
   's08-03-search-field-indexes':[
    'Кандидат в индекс выводится из запроса и распределения данных.',
    'Долю совпадений считают на конкретном наборе с явной формулой.',
    'Порядок частей B-tree определяет доступные левые префиксы.',
    'Перед созданием сверяют PK, UNIQUE и уже существующие индексы.',
    'DDL выполняют отдельным контролируемым этапом.',
    'Оценки EXPLAIN отличают от фактических строк и измеренного времени.',
    'Выгоду чтения сопоставляют со стоимостью записи и хранения.',
    'Реестр сохраняет запрос, условия опыта и границы вывода.'
   ]
  };
  // The complete rules remain in their original notebook pages and teacher speech.
  // Conclusions synthesize them instead of repeating eight full notebook paragraphs.
  if(conclusions[l.id])l.slides.find(s=>s.kind==='summary').bullets=conclusions[l.id];
  registry.find(r=>r.id===l.id).estimatedMinutes=Math.round(l.slides.reduce((n,s)=>n+notes[s.id].estimatedSeconds,0)/60);
 }
 // Replace inherited question headings with atomic subject concepts.
 course.glossary=[...glossary.values()].sort((a,b)=>a.term.localeCompare(b.term,'ru'));
 // Incorrect alternatives describe plausible subject mistakes, not unrelated design choices.
 const distractors={
  's07-01-source-data-package-content-deliverables-T01':{o3:'Только ER-диаграмму без скрипта и испытания загрузки'},
  's07-02-table-list-from-source-data-content-catalog-T01':{o3:'Только число строк в текущем файле',o5:'Только текущие значения данных без правил атрибутов'},
  's07-04-er-diagram-content-reverse-T01':{o1:'Совпадение имён столбцов без объявленного FK'},
  's07-04-er-diagram-content-cardinality-T01':{o4:'Каждый родитель обязан иметь дочернюю строку, если FK объявлен'},
  's07-04-er-diagram-content-reconcile-T01':{o3:'Да, если одинаково количество таблиц'},
  's07-05-prepare-and-load-data-content-empty-T01':{o1:'Только наличие NOT NULL без проверки пустого текста'},
  's07-07-control-queries-content-joins-T01':{o3:'Только совпадение количества строк в обеих таблицах'},
  's07-07-control-queries-content-report-T01':{o5:'Обязательное включение всех столбцов исходных таблиц'}
 };
 for(const l of course.lectures)for(const s of l.slides)if(s.task?.options){const replacements=distractors[s.task.id];if(!replacements)continue;for(const o of s.task.options)if(replacements[o.id]){if(keys[s.task.id].correct?.includes(o.id))throw Error('Distractor points at correct choice');o.text=replacements[o.id];}}
 fs.writeFileSync('public/learning.json',JSON.stringify(learning,null,2)+'\n');
 return learning;
}
