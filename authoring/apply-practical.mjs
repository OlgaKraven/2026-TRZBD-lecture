import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {practicalCase} from './practical-cases.mjs';
const studentExplanation={
 's08-01-views-content-register-example':'Три представления отвечают на разные вопросы. v_open_requests возвращает открытые заявки, v_branch_counts — итоги по всем филиалам, v_source_mismatch — найденные ошибки сопоставления. У них различаются колонки, гранулярность и ожидаемый результат. Реестр связывает каждый контракт с его определением и отдельными проверками.',
 's08-02-coordinated-data-changes-content-start-example':'На стенде status_id=1 означает NEW, 2 — WORK. В текущей сессии до UPDATE видим 1, после UPDATE внутри транзакции — 2, после ROLLBACK — снова 1. Наблюдаемое изменение до COMMIT ещё можно отменить. SELECT @@autocommit сообщает настройку сессии; явные границы опыта заданы START TRANSACTION и ROLLBACK.',
 's08-02-coordinated-data-changes-content-commit-example':'Каждая проверка устраняет отдельный риск. Ноль изменённых заявок означает, что нужный переход не состоялся; отсутствующая работа оставляет частичный результат. COMMIT выбирают после подтверждения обоих фактов по одному request_id. В процедуре эти условия выражены условным UPDATE, ROW_COUNT и обработчиком ошибок.',
 's08-02-coordinated-data-changes-content-trigger-example':'NEW.id — ключ изменяемой заявки; OLD.status_id и NEW.status_id — статус той же строки до и после UPDATE. При смене NEW на WORK они различаются, поэтому триггер добавляет событие. При изменении только received_at статусы равны и события нет. INSERT журнала InnoDB относится к исходной транзакции: ROLLBACK отменяет и статус, и событие.',
 's08-03-search-field-indexes-content-cost-example':'Одиночный индекс по request_no повторяет доступ уже существующего UNIQUE. Составной индекс имеет отдельную гипотезу: фильтр по филиалу и статусу с порядком даты. Набор индексов на каждый столбец не обоснован без запросов и цены записи. При изменении нагрузки решения пересматривают по новым условиям.',
 's08-03-search-field-indexes-content-index-register-example':'Запись связывает запрос, данные, состав индекса и наблюдение ALL → ref. Если оставить фильтр только по status_id, равенство по ведущему branch_id исчезнет. Прежнее обоснование непрерывного левого префикса уже неприменимо: для нового SELECT требуется отдельный план. Числа rows не становятся измерением времени.',
 's08-04-access-control-content-allowed-example':'Исходная таблица стенда задаёт соответствие R102 → id=2; работа DIAG для неё ещё не добавлена. Редактор вставляет именно этот подготовленный ключ и известный код работы. Успех подтверждает право INSERT, затем ROLLBACK отменяет пробу. Вариант INSERT SELECT из requests потребовал бы дополнительного SELECT, которого у этой роли нет.',
 's08-06-results-package-content-er-example':'requests имеет три обязательных родителя: clients, branches и request_statuses. Одна заявка ссылается ровно на одного родителя каждого типа; родитель может иметь 0..N заявок. Остальные пять FK связывают детали, работы и журнал. Сверяются конкретные пары столбцов и их ограничения; общее число восьми линий само по себе правильность не доказывает.'
};
export function applyPractical(course,notes,questions,registry){
 const learning=JSON.parse(fs.readFileSync('public/learning.json','utf8'));
 const added=[];
 for(const [li,l] of course.lectures.entries()){
  for(const [qi,q] of learning.questions.filter(q=>q.case.lectureId===l.id).entries()){
   const item=q.case;item.practical=practicalCase(li,qi,item.model);
   item.revision=createHash('sha256').update(JSON.stringify({model:item.model,practical:item.practical})).digest('hex').slice(0,12);
   const stages=item.practical.variants[0].stages;
   notes[q.passportId].script='Откройте практический разбор. '+item.data+' '+item.question+' Последовательно выполняйте действия: '+stages.slice(1).map(s=>s.action+'. '+s.explanation).join(' ')+' После каждого действия сопоставьте строки исходной таблицы и полученный результат. Кнопка отмены восстанавливает данные предыдущего шага. '+(item.practical.variants.length>1?'Затем измените условия разбора и повторите операции: '+item.practical.variants.map(v=>v.label).join('; ')+'. Смена условий начинает новый проход с исходных данных.':'');
   notes[q.passportId].answer=stages.at(-1).explanation+' '+item.reason;
  }
  const rebuilt=[];
  for(const s of l.slides){
   rebuilt.push(s);
   if(!(s.visual||s.rows||s.image||learning.lectureModels[s.id]))continue;
   const original=notes[s.id],text=studentExplanation[s.id]||original.script.split(/\n\nПоказ:/)[0].trim();
   if(!text)continue;
   const id=s.id+'-walkthrough';
   const solution={id,kind:'theory',kicker:'Разобранное решение',title:'Ход решения: '+s.title,body:text,source:s.source};
   rebuilt.push(solution);added.push(id);
   notes[id]={...original,script:text,questions:'Какие исходные значения и операции объясняют этот результат?',answer:'',notebook:'',estimatedSeconds:Math.ceil(text.split(/\s+/).length/1.8)+30};
   notes[s.id]={...original,script:'Рассмотрите исходные строки, поля и операцию этого примера. На следующем экране последовательно разберём, откуда получен результат и какие условия необходимы. '+(s.visual?'Покажите соответствующие строки SQL.':s.image?'Проследите концы связей и подписи ключей.':'Сопоставьте ключи и значения строк.'),estimatedSeconds:60};
   const member=learning.slides[s.id];
   if(member){learning.slides[id]={...member};const q=learning.questions.find(q=>q.id===member.questionId);q.slideIds.splice(q.slideIds.indexOf(s.id)+1,0,id);const manifest=questions.find(q=>q.questionId===member.questionId);manifest.slideIds.splice(manifest.slideIds.indexOf(s.id)+1,0,id);manifest.evidenceSlideIds.push(id);}
  }
  l.slides=rebuilt;
  const curriculum=course.curriculum.find(x=>x.topic===l.sourceTitle);curriculum.slideIds=l.slides.filter(s=>!s.task).map(s=>s.id);
  const r=registry.find(x=>x.id===l.id);r.slides=l.slides.length;r.estimatedMinutes=Math.round(l.slides.reduce((sum,s)=>sum+notes[s.id].estimatedSeconds,0)/60);
 }
 learning.workedExplanations=added;
 fs.writeFileSync('public/learning.json',JSON.stringify(learning,null,2)+'\n');
}
