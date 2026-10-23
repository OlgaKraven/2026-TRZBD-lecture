import fs from 'node:fs';
const code=(suffix,title,sql,body)=>({suffix,title,kind:'example',body,visual:{type:'codeParts',parts:[{code:sql,label:title,explanation:'Учебный стенд MySQL 8.4'}],caption:title}});
const theory=(suffix,title,body)=>({suffix,title,kind:'theory',body});
export function completeStandalonePaths(course,notes,questions,registry){
 const learning=JSON.parse(fs.readFileSync('public/learning.json','utf8')),added=[];
 const source=fs.readFileSync('examples/data/requests.csv','utf8').trim().split(/\r?\n/);
 function insert(lectureId,anchorId,where,spec){
  const l=course.lectures.find(l=>l.id===lectureId),anchor=l.slides.find(s=>s.id===lectureId+'-content-'+anchorId);
  if(!anchor)throw Error('Missing reading-path anchor '+anchorId);
  const {suffix,...fields}=spec,id=lectureId+'-content-'+suffix;
  const s={id,kicker:'От условия к выполнению',source:anchor.source,...fields};
  l.slides.splice(l.slides.indexOf(anchor)+(where==='after'?1:0),0,s);added.push(id);
  notes[id]={...notes[anchor.id],script:s.body,answer:'',notebook:'',questions:'',estimatedSeconds:s.visual?120:75};
  const member=learning.slides[anchor.id];
  if(member){learning.slides[id]={...member};const q=learning.questions.find(q=>q.id===member.questionId),manifest=questions.find(q=>q.questionId===member.questionId);q.slideIds.push(id);manifest.slideIds.push(id);manifest.evidenceSlideIds.push(id);}
 }
 const add=(li,anchor,where,spec)=>insert(course.lectures[li].id,anchor,where,spec);
 add(0,'context-walkthrough','after',code('source-accepted','Исходник: строки 1–3',[source[0],...source.slice(1,4)].join('\n'),'Это CSV, а не SQL. После заголовка считаются строки данных: R101, R102, R103. Точка с запятой в part_codes разделяет детали внутри одного поля.'));
 add(0,'source-accepted','after',code('source-rejected','Исходник: строки 4–6',[source[0],...source.slice(4)].join('\n'),'B99 отсутствует в branches; у строки 5 нет номера; строка 6 повторяет R101. Эти три строки сохраняются в staging и получают причины отказа. Они не исчезают из баланса шести строк.'));
 add(2,'order-example-walkthrough','after',code('requests-ddl-start','requests: поля и ключи',`CREATE TABLE requests (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
 request_no VARCHAR(24) NOT NULL UNIQUE,
 client_id BIGINT UNSIGNED NOT NULL,
 branch_id BIGINT UNSIGNED NOT NULL,
 status_id BIGINT UNSIGNED NOT NULL,
 received_at DATETIME NOT NULL,`,'Начало одной команды CREATE TABLE; продолжение — на следующем экране. Родители clients, branches, request_statuses уже созданы. Типы их id совпадают с типами ссылок.'));
 add(2,'requests-ddl-start','after',code('requests-ddl-end','requests: ограничения и завершение',` CONSTRAINT chk_request_no
  CHECK (CHAR_LENGTH(TRIM(request_no)) > 0),
 CONSTRAINT fk_requests_client FOREIGN KEY (client_id)
  REFERENCES clients(id),
 CONSTRAINT fk_requests_branch FOREIGN KEY (branch_id)
  REFERENCES branches(id),
 CONSTRAINT fk_requests_status FOREIGN KEY (status_id)
  REFERENCES request_statuses(id)
) ENGINE=InnoDB;`,'Продолжение предыдущего фрагмента. CHECK запрещает пустой номер; три FK проверяют родителей. Скобка и точка с запятой завершают одну команду CREATE TABLE.'));
 add(4,'resolve-example-walkthrough','after',code('insert-resolved','От найденных id к INSERT',`INSERT INTO requests
 (request_no,client_id,branch_id,status_id,received_at)
SELECT s.request_no,c.id,b.id,d.id,
 CAST(s.received_at AS DATETIME)
FROM stage_requests s
JOIN clients c ON c.code=s.client_code
JOIN branches b ON b.code=s.branch_code
JOIN request_statuses d ON d.code=s.status_code
WHERE NOT EXISTS (SELECT 1 FROM load_rejections e
 WHERE e.source_row=s.source_row);`,'requests пуста; staging, справочники и протокол отказов подготовлены.'));
 add(4,'insert-resolved','after',{suffix:'insert-result',title:'Три строки после преобразования',kind:'example',columns:['request_no','client_id','branch_id','status_id'],rows:[['R101','1','1','1'],['R102','2','1','2'],['R103','1','2','3']],body:'R101 получил ссылки на C01, B01 и NEW. NOT EXISTS оставил строки, для которых в load_rejections нет записи с тем же source_row. Строки 4–6 исключены; исходные коды сохранены в staging. Повторный INSERT требует отдельного правила.'});
 add(5,'orphans-example-walkthrough','after',code('compare-source-parent','Сверка существующего родителя',`SELECT s.source_row,s.client_code AS expected,
 c.code AS actual
FROM stage_requests s
JOIN requests r ON r.request_no=s.request_no
JOIN clients c ON c.id=r.client_id
WHERE NOT EXISTS (SELECT 1 FROM load_rejections e
 WHERE e.source_row=s.source_row)
 AND c.code<>s.client_code;`,'В исходном исправном наборе результат пуст. Если R101 ошибочно ссылается на C02, запрос вернёт expected=C01, actual=C02. FK такую подмену не обнаруживает: оба клиента существуют. Отклонённые исходные строки не участвуют в сверке.'));
 add(7,'meaning-example','before',code('view-owner-setup','Кто исполняет запрос VIEW',`CREATE USER 'trzbd_view_owner'@'localhost'
 ACCOUNT LOCK;
GRANT SELECT ON service_training.*
 TO 'trzbd_view_owner'@'localhost';`,'Однократная подготовка администратором в отдельном стенде перед CREATE VIEW. ACCOUNT LOCK запрещает вход владельцу, но не использование его прав через DEFINER. Здесь выбрано чтение учебной схемы; существующую учётную запись сначала проверяют, а не создают повторно.'));
 add(8,'procedure-example','before',code('procedure-create-start','Создание процедуры: начало',`DELIMITER $$
CREATE PROCEDURE close_request(
 IN p_request_id BIGINT UNSIGNED,
 IN p_work_code VARCHAR(12))
SQL SECURITY INVOKER
BEGIN`,'Далее идут два фрагмента тела этой же команды, затем END и возврат разделителя. Процедура сама управляет транзакцией: CALL выполняют вне уже начатой транзакции. INVOKER требует необходимых прав у вызывающего.'));
 const procedure=course.lectures[8].slides.find(s=>s.id.endsWith('-procedure-example'));
 procedure.visual.parts[0].code=`DECLARE v_closed BIGINT UNSIGNED;
DECLARE EXIT HANDLER FOR SQLEXCEPTION
 BEGIN ROLLBACK; RESIGNAL; END;
START TRANSACTION;
SELECT id INTO v_closed FROM request_statuses
 WHERE code='CLOSED';
UPDATE requests SET status_id=v_closed
 WHERE id=p_request_id AND status_id<>v_closed;`;
 add(8,'procedure-example','after',code('procedure-body-finish','Проверка изменения и запись работы',`IF ROW_COUNT()<>1 THEN
 SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT='Заявка отсутствует или уже закрыта';
END IF;
INSERT INTO completed_works(request_id,work_code)
 VALUES(p_request_id,p_work_code);
COMMIT;`,'Продолжение тела: ROW_COUNT проверяется сразу после UPDATE. SIGNAL попадёт в обработчик; ошибка INSERT вызовет тот же полный откат. COMMIT выполняется только при успехе.'));
 add(8,'procedure-body-finish','after',code('procedure-create-end','Создание процедуры: завершение',`END$$
DELIMITER ;
SHOW CREATE PROCEDURE close_request;`,'Соедините начало, тело и завершение в один сценарий клиента mysql. DELIMITER — команда клиента, позволяющая передать BEGIN…END целиком. Только после успешного CREATE процедура доступна для CALL; отдельный DECLARE на верхнем уровне не выполняется.'));
 add(8,'procedure-example-walkthrough','after',code('procedure-call','Вызов и проверка обоих фактов',`SELECT id INTO @request_id FROM requests
 WHERE request_no='R101';
CALL close_request(@request_id,'DIAG');
SELECT s.code,w.work_code FROM requests r
JOIN request_statuses s ON s.id=r.status_id
JOIN completed_works w ON w.request_id=r.id
WHERE r.id=@request_id;`,'Первый успешный опыт на исходном R101: ожидается CLOSED / DIAG и одна новая запись аудита. Повторный CALL даст отказ «уже закрыта». Для поздней ошибки используйте ещё открытую R102 и UNKNOWN: её статус WORK и число работ должны сохраниться.'));
 add(9,'plans-example','before',code('plans-reset','Возврат опыта к исходной точке',`SHOW INDEX FROM requests_plan
 WHERE Key_name='idx_plan_branch_status_date';
ALTER TABLE requests_plan
 DROP INDEX idx_plan_branch_status_date;`,'В предыдущем вопросе этот индекс уже создан. В собственной таблице опыта сначала подтвердите его имя и состав, затем удалите только этот индекс. Теперь следующий фрагмент корректно сравнит план без него и после создания. Если индекса нет, DROP не выполняют.'));
 add(10,'activation-example','before',code('role-user-setup','Подготовка роли и пользователя',`CREATE ROLE 'trzbd_viewer';
GRANT SELECT ON service_training.v_open_requests
 TO 'trzbd_viewer';
CREATE USER 'training_operator'@'localhost'
 IDENTIFIED BY RANDOM PASSWORD;`,'Администратор выполняет это один раз перед назначением роли. MySQL возвращает сгенерированный пароль: его сохраняют локально для входа оператора. Имя роли ещё не назначает её пользователю. После GRANT и SET DEFAULT ROLE откройте отдельное соединение оператора.'));
 add(11,'restore-example-walkthrough','after',code('restore-connect','Подключение к отдельной цели',`mysql --defaults-extra-file=restore.cnf

-- Уже внутри клиента mysql:
SELECT @@hostname,@@port,VERSION(),CURRENT_USER();
SELECT SCHEMA_NAME FROM information_schema.schemata
 WHERE SCHEMA_NAME='service_training';`,'Первую строку запускают в оболочке из каталога копии. restore.cnf указывает отдельный целевой экземпляр. Затем выполняют SQL внутри клиента. Схемы service_training в цели ещё нет; при неожиданном сервере или существующей схеме импорт не начинают.'));
 add(11,'restore-connect','after',code('restore-import','Импорт копии и первая сверка',`CREATE DATABASE service_training
 CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE service_training;
SOURCE service_training.sql;
SHOW FULL TABLES;
SELECT COUNT(*) AS requests_count FROM requests;`,'Файл находится в рабочем каталоге клиента; SOURCE — его команда чтения SQL-файла. До импорта подготовлены владельцы DEFINER, после — роли и GRANT. При ошибке остановитесь и разберите причину. В исходной копии ожидаются 13 таблиц, три VIEW и три заявки; далее проверяются определения, значения и поведение.'));
 add(12,'scripts-example-walkthrough','after',theory('delivery-state','Как повторить маршрут без скрытых шагов','До запуска выбраны отдельный сервер, новая схема и исходные три CSV. 01_schema создаёт структуру; 02_load читает файлы и классифицирует строки; 03_verify сверяет результат. 04_objects требует владельца VIEW и создаёт поведение, 05_roles задаёт прикладные полномочия. Локальных пользователей создают до назначения им ролей. Опыт индекса выполняется отдельно. Если шаг завершился ошибкой, следующий не считается успешным продолжением: сохраняют журнал и исправляют исходный сценарий.'));
 // Correct copied command boundaries without changing their SQL semantics.
 const trigger=course.lectures[8].slides.find(s=>s.id.endsWith('-trigger-example'));
 trigger.visual.parts[0].code='DELIMITER $$\n'+trigger.visual.parts[0].code+'\nDELIMITER ;';
 const dump=course.lectures[11].slides.find(s=>s.id.endsWith('-dump-example'));
 dump.visual.parts[0].code=dump.visual.parts[0].code.replace(/\s*\n\s*/g,' ');
 const dw=course.lectures[11].slides.find(s=>s.id===dump.id+'-walkthrough');
 dw.body='Это одна физическая команда; перенос на экране происходит автоматически. defaults-extra-file стоит первым параметром. backup.cnf содержит локальное соединение и не передаётся в комплекте. --result-file записывает SQL средствами mysqldump. Перед запуском подтверждают источник и отсутствие конфликтующего DDL; успешное завершение ещё требует восстановления и сверки.';notes[dw.id].script=dw.body;
 const fk=course.lectures[2].slides.find(s=>s.id.endsWith('-fk-example-walkthrough'));
 fk.body+=' Здесь CONSTRAINT — фрагмент внутри CREATE TABLE. Полное определение requests следует в вопросе 7, после разбора всех ограничений.';notes[fk.id].script=fk.body;
 const contexts=[null,
 'R101 связан с C01 и B01; P01 и P07 образуют две позиции request_parts. Сведения о клиенте относятся к clients, сведения о филиале — к branches. Количество детали принадлежит паре заявки и детали. Так из одного входа получаются разные единицы учёта.',
 'Для трёх заявок уже известны родители: clients 1=C01, 2=C02; branches 1=B01, 2=B02; статусы 1=NEW, 2=WORK, 3=CLOSED. CREATE TABLE закрепляет типы, уникальность номера и три обязательные ссылки. DDL проверяется по определениям, а не по наличию этих трёх строк.',
 'В R101 ссылки client_id=1, branch_id=1, status_id=1 ведут к C01, B01 и NEW. На ER каждая линия читается по паре столбцов и кратностям. Три FK заявки — часть восьми FK стенда; остальные связывают детали, работы и журнал.',
 'Во входном requests.csv шесть строк. Первые три дают R101, R102, R103; строки 4–6 содержат B99, пустой номер и повтор R101. Staging сохраняет все шесть, requests — только три принятых. R101 с P01;P07 даёт две строки request_parts, поэтому позиций всего четыре.',
 'На исходном состоянии requests=3, request_parts=4, completed_works=1. R101 должен ссылаться на C01, B01 и NEW. Сохранение количества при подмене client_id на существующего C02 объясняет, зачем после COUNT независимо сравниваются поля и ссылки.',
 'Три строки requests означают три заявки. Соединение с четырьмя позициями request_parts даёт четыре строки: R101 повторяется для P01 и P07. Филиал B03 не имеет заявок. На этих двух свойствах проверяются гранулярность, LEFT JOIN и агрегаты.',null,null,null,
 'Заявки и их связи уже корректны; меняется контекст доступа. Viewer читает v_open_requests, editor работает с completed_works. Исходный R102 имеет id=2; этот подготовленный ключ позволяет проверить INSERT редактора без дополнительного SELECT из закрытой для него requests.',
 'Копируется исходное состояние: три заявки, четыре позиции, одна работа и пустой журнал смены статуса. Восстановление сначала должно вернуть именно этот снимок. Успешные и ошибочные CALL запускаются после сравнения снимка, поскольку меняют проверяемые данные.',
 'Один и тот же R101 прослеживается от строки CSV через client_id/branch_id/status_id к отчёту, операции закрытия и восстановленной копии. Передаваемый комплект должен сохранять эту цепочку происхождения и правила отказов, а не только целевые три строки.'
 ];
 for(const [li,l] of course.lectures.entries()){
  for(const s of l.slides){
   if(s.bullets)s.bullets=s.bullets.map(t=>t.replace('WHERE s.code <> CLOSED',"WHERE s.code <> 'CLOSED'"));
   notes[s.id].script=notes[s.id].script.replace('WHERE s.code <> CLOSED',"WHERE s.code <> 'CLOSED'");
  }
  if(contexts[li]){const s=l.slides.find(s=>s.id.endsWith('-context-walkthrough'));s.body=s.body.split('\n\n')[0]+'\n\n'+contexts[li];notes[s.id].script=s.body;}
  const r=registry.find(r=>r.id===l.id);r.slides=l.slides.length;r.estimatedMinutes=Math.round(l.slides.reduce((a,s)=>a+notes[s.id].estimatedSeconds,0)/60);
  course.curriculum.find(x=>x.topic===l.sourceTitle).slideIds=l.slides.filter(s=>!s.task).map(s=>s.id);
  for(const q of learning.questions.filter(q=>q.case.lectureId===l.id)){
   q.slideIds=l.slides.filter(s=>learning.slides[s.id]?.questionId===q.id).map(s=>s.id);
   const manifest=questions.find(x=>x.questionId===q.id);manifest.slideIds=[...q.slideIds];
   const evidence=new Set(manifest.evidenceSlideIds);manifest.evidenceSlideIds=l.slides.filter(s=>evidence.has(s.id)).map(s=>s.id);
  }
 }
 learning.standaloneAdditions=added;
 fs.writeFileSync('public/learning.json',JSON.stringify(learning,null,2)+'\n');
}
