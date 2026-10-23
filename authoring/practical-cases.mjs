const clone=x=>structuredClone(x);
const T=(name,columns,rows)=>({name,columns:columns.split('|'),rows:rows.map(r=>r.split('|'))});
const A=(action,name,columns,rows,sql='')=>({action,result:T(name,columns,rows),sql});
// Each operation produces concrete rows, constraints or an executable delivery decision.
const recipes=[
[
[A('Найти неразрешённый код','Проверка branch_code','branch_code|matches',['B8|0']),A('Приостановить зависимую загрузку','Приёмка requests.csv','field|dependency|state',['branch_code|branches.code|ожидается согласованный источник'])],
[A('Сгруппировать номера актов','Повторы act_no','act_no|count',['A31|2']),A('Сравнить два правила ключа','Варианты ограничения','scope|key|two_rows_allowed',['весь период|UNIQUE(act_no)|нет','внутри года|UNIQUE(act_year,act_no)|да'])],
[A('Проверить календарную дату','Ошибка преобразования','source_row|date_text|valid',['6|2026-02-30|нет']),A('Сохранить причину отклонения','import_errors','source_row|field|reason',['6|act_date|INVALID_DATE'])],
[A('Восстановить в отдельную цель','Восстановленные объекты','object|check',['requests|SHOW CREATE TABLE','v_requests|SHOW CREATE VIEW']),A('Сверить данные и поведение','Протокол восстановления','check|evidence',['состав|совпадают имена и определения','данные|сверены значения по ключам','поведение|выполнены контрольные вызовы'])],
[A('Найти клиента по K9','Разрешение кода','buyer_code|client_id',['K9|17']),A('Записать внутренний ключ заказа','orders','id PK|client_id FK|order_no',['1|17|O1'],"INSERT INTO orders(id,client_id,order_no) VALUES(1,17,'O1');")],
[A('Сопоставить файл с доменом','Проверка status','status|allowed',['NEW|да']),A('Сохранить полный справочник','statuses','code PK|meaning',['NEW|новая','WORK|в работе','CLOSED|закрыта'])],
[A('Выполнить независимые проверки','Нарушения','source_row|rule',['1|UNKNOWN_CLIENT','2|INVALID_DATE','1|DUPLICATE_ORDER_NO','2|DUPLICATE_ORDER_NO']),A('Сохранить раздельную диагностику','import_errors','source_file|source_row|rule',['orders.csv|1|UNKNOWN_CLIENT','orders.csv|2|INVALID_DATE','orders.csv|1|DUPLICATE_ORDER_NO','orders.csv|2|DUPLICATE_ORDER_NO'])],
[A('Проверить баланс','Баланс строк','input|accepted|rejected|unaccounted',['14|12|2|0']),A('Связать итог с исходными строками','import_errors','run_id FK|file|source_row|reason',['R1|orders.csv|4|UNKNOWN_CLIENT','R1|orders.csv|9|INVALID_DATE'])]
],
[
[A('Сгруппировать сотрудников по фамилии','Проверка зависимости','surname|distinct_employee_no',['Иванов|2']),A('Зафиксировать определяющий ключ','Зависимость','determinant|dependent|basis',['employee_no|surname|уникальный табельный номер'])],
[A('Найти тип работы в справочнике','Разрешение типа','type_code|matches',['REPAIRE|0']),A('Отклонить неподтверждённый тип','Отклонение строки','source_row|field|reason',['1|type_code|UNKNOWN_WORK_TYPE'])],
[A('Посчитать повторения пары','Группировка деталей','request_no|part_code|count',['X7|D2|2','X7|D5|1']),A('Записать количество в связь','request_parts','request_no PK,FK|part_code PK,FK|qty',['X7|D2|2','X7|D5|1'])],
[A('Выделить владельца телефона','clients','id PK|code UNIQUE|phone',['17|K9|+7…']),A('Связать заявки с одним клиентом','requests','id PK|client_id FK',['Q1|17','Q2|17'])],
[A('Прочитать две роли ссылки','Роли сотрудников','repair_id|assigned|approved',['R1|5|8']),A('Получить имена через два JOIN','Результат запроса','repair_id|assigned_name|approved_name',['R1|Исполнитель|Утвердивший'])],
[A('Найти повтор бизнес-идентификатора','Конфликт паспорта','passport_no|count|row_ids',['P123|2|5,8']),A('Подготовить отдельное ограничение','План исправления','column|before_ddl|constraint',['passport_no|согласованно устранить конфликт|UNIQUE(passport_no)'])],
[A('Сверить фактического родителя','Сверка по источнику','request_no|actual_code|source_code',['Q1|K4|K6']),A('Разрешить правильного клиента','Исправленная ссылка','request_no|old_client_id|new_client_id',['Q1|4|9'])],
[A('Получить определение таблицы','Метаданные','table_name|columns',['request_items|request_id,part_id']),A('Зафиксировать соответствие имён','Каталог','logical_name|physical_name',['request_parts|request_items'])]
],
[
[A('Выбрать целевую схему','Контекст соединения','DATABASE()',['training_a'],'USE training_a;\nSELECT DATABASE();'),A('Сверить созданный объект','Метаданные','schema|table',['training_a|requests'])],
[A('Сравнить представления артикула','Сравнение типов','representation|stored_value',['INT|731','VARCHAR|000731']),A('Сохранить значимые нули','parts','id PK|article VARCHAR(20)',['1|000731'])],
[A('Посчитать подтверждённые строки','Результат COUNT','COUNT(*)',['10']),A('Сопоставить с выделением номеров','Разные величины','rows|MAX(id)|next_id',['10|17|19'])],
[A('Проверить существование родителя 77','Проверка FK','branch_id|parent_exists',['77|нет']),A('Остановить неверную вставку','Состояние загрузки','request_id|branch_id|inserted',['Q1|77|нет: нужен правильный родитель'])],
[A('Применить TRIM к имени','Содержательная проверка','id|name_length|trimmed_length',['1|3|0']),A('Вывести нарушающие строки','Результат запроса','id',['1'])],
[A('Вставить два отсутствующих nickname','users','id PK|nickname UNIQUE NULL',['1|NULL','2|NULL']),A('Найти строки без nickname','Результат IS NULL','id',['1','2'])],
[A('Построить зависимости DDL','Зависимости','child|parent',['orders|clients','order_lines|orders']),A('Создать родителей раньше потомков','Порядок DDL','step|table',['1|clients','2|orders','3|order_lines'])],
[A('Подготовить чистую цель','Контекст испытания','schema|preexisting_tables',['training_clean|0']),A('Сверить полный DDL по метаданным','Приёмка структуры','object|properties',['requests|столбцы, типы, PK, FK, обязательность'])]
],
[
[A('Прочитать объявленные FK','Метаданные связи','table|column|parent|parent_column',['requests|client_id|clients|id']),A('Обновить связь на ER','Актуальная связь','from|to',['requests.client_id|clients.id'])],
[A('Прочитать обязательность атрибута','COLUMN metadata','column|type|IS_NULLABLE',['amount|DECIMAL(8,2)|YES']),A('Отразить отдельные свойства','Атрибут ER','name|domain|nullable',['amount|DECIMAL(8,2)|да'])],
[A('Сопоставить клиентов и счета','Число счетов','customer_id|invoice_count',['C1|1','C2|0']),A('Подписать минимумы связи','Кратность','direction|min|max',['invoice → customer|1|1','customer → invoice|0|N'])],
[A('Сравнить позиции одной детали','Позиции чека','receipt_id|line_no|part_id|price',['R1|1|D2|100','R1|2|D2|120']),A('Назначить ключ позиции','Ограничение','table|PK|permitted',['receipt_lines|receipt_id,line_no|обе позиции D2'])],
[A('Сравнить минимум ER и DDL','Расхождение','property|ER|DDL',['client required|0..1|NOT NULL + FK']),A('Согласовать обязательность','Согласованный вариант','attribute|minimum_parent_count',['client_id|1 по согласованному обязательному правилу'])],
[A('Проследить концы линии','Концы связи','from|to',['clients.id|requests.client_id']),A('Проверить предполагаемый FK к audit','Проверка связи','audit_FK|basis',['не установлен по пересечению|нужны концы и метаданные'])],
[A('Сравнить действия DELETE','Расхождение версий','constraint|ER|DDL',['fk_request_client|RESTRICT|CASCADE']),A('Привязать ER к определению','Согласованная версия','constraint|delete_rule',['fk_request_client|CASCADE из согласованной DDL'])],
[A('Проверить границы экспорта','Проверка рисунка','element|state',['правый конец связи|обрезан']),A('Восстановить область схемы','Читаемая связь','parent|child|min_child|max_child',['customers.id|invoices.customer_id|0|N'])]
],
[
[A('Сопоставить заголовки по позиции','Конфликт контракта','position|expected|actual',['1|code|name','2|name|code']),A('Применить явное именное сопоставление','stg_branches','code|name',['B08|Сервис'])],
[A('Разобрать закрывающую кавычку','Состояние CSV','token|state',['B08|поле 1 завершено','"Сервис"|кавычка закрыта','X|недопустим после кавычки']),A('Отклонить синтаксически неверную запись','Ошибка CSV','source_row|reason|target_rows_added',['2|UNEXPECTED_AFTER_QUOTE|0'])],
[A('Применить правила каждого поля','Результат нормализации','field|input|normalized',['code|три пробела|пустой обязательный код','comment|пустое поле|NULL по контракту']),A('Сохранить причину отказа кода','Отклонение','source_row|field|reason',['1|code|EMPTY_CODE'])],
[A('Найти конфликт сумм по номеру','Дубли бизнес-ключа','order_no|count|min_amount|max_amount',['Q18|2|100|150']),A('Отделить конфликт от загрузки','Протокол конфликта','order_no|decision|target_change',['Q18|нужно согласовать сумму|не выполнять до решения'])],
[A('Проверить qty > 0','Предметная проверка','source_row|qty|passes',['1|-2|нет']),A('Отклонить недопустимое количество','Отклонение','source_row|field|reason',['1|qty|NON_POSITIVE_QTY'])],
[A('Загрузить родительское подразделение','departments','id PK|code UNIQUE',['3|D3']),A('Загрузить сотрудника с FK','employees','id PK|department_id FK',['8|3'])],
[A('Посчитать родителей с кодом B8','Неоднозначный поиск','code|matching_ids|count',['B8|2,7|2']),A('Не назначать произвольный FK','Протокол сопоставления','request_no|branch_code|state',['Q1|B8|AMBIGUOUS_CODE: исправить справочник'])],
[A('Посчитать учтённые исходы','Баланс','input|accepted|rejected|missing',['17|13|3|1']),A('Найти строку без исхода','Неучтённая строка','source_row|state',['17|нет записи ни о приёмке, ни об отклонении'])]
],
[
[A('Найти пропущенные ключи','Ожидание без факта','order_no',['Q3']),A('Найти лишние ключи','Факт без ожидания','order_no',['Q8'])],
[A('Нормализовать номер для проверки','Проверка номера','id|TRIM(request_no)',['1|']),A('Вывести нарушение обязательности','Нарушение','id|reason',['1|EMPTY_REQUEST_NO'])],
[A('Проверить существование client_id','Проверка FK','client_id|exists',['10|да']),A('Сверить бизнес-код с документом','Ошибка существующей ссылки','request_no|actual_client|expected_client',['Q1|K10|K6'])],
[A('Различить файлы одной координаты','Координаты отклонений','source_file|source_row',['clients.csv|4','orders.csv|9']),A('Сохранить воспроизводимую диагностику','import_errors','source_file|source_row|reason',['clients.csv|4|missing code','orders.csv|9|invalid date'])],
[A('Установить зависимости файлов','Зависимости исполнения','script|requires',['data.sql|ddl.sql','views.sql|согласованная структура','check.sql|структура, данные и VIEW']),A('Выполнить маршрут по зависимостям','Маршрут','step|script|evidence',['1|ddl.sql|метаданные','2|data.sql|баланс и значения','3|views.sql|контракт чтения','4|check.sql|результаты запросов'])],
[A('Исключить старые объекты','Цель испытания','schema|old_objects',['training_acceptance|0']),A('Развернуть текущий комплект','Результат испытания','input|objects|data',['только текущие файлы|созданы полным DDL|загружены и сверены'])],
[A('Сопоставить разные внутренние id','Ссылки запусков','run|client_id|business_code',['A|17|K9','B|21|K9']),A('Сравнить предметный результат','Эквивалентность по контракту','property|result',['бизнес-факты|совпадают','ссылки на K9|сохранены','конкретные id|различаются; проверить требование контракта'])],
[A('Выполнить поиск сирот','Контрольные строки','r.id|missing_client',[]),A('Сохранить проверяемое свидетельство','Протокол','predicate|expected|actual',['нет ненулевых ссылок без родителя|0 строк|0 строк'])]
],
[
[A('Построить пары заявка–деталь','JOIN','request_id|part_id',['Z1|D1','Z1|D2','Z1|D3']),A('Посчитать уникальные заявки','Результат агрегата','COUNT(*)|COUNT(DISTINCT r.id)',['3|1'])],
[A('Выполнить INNER JOIN','Результат JOIN','client_id|order_id',['C8|O1','C8|O2']),A('Сохранить клиента без заказа через LEFT','Результат LEFT JOIN','client_id|order_id',['C8|O1','C8|O2','C9|NULL'])],
[A('Вычесть факт из ожидания','Пропущенные ключи','code',['B']),A('Вычесть ожидание из факта','Лишние ключи','code',['D'])],
[A('Сгруппировать по бизнес-номеру','Группы','no|count',['U5|3']),A('Применить HAVING COUNT(*) > 1','Нарушения уникальности','no|count',['U5|3'])],
[A('Построить LEFT JOIN','До WHERE','branch_id|request_id|status',['B4|R4|WORK','B5|NULL|NULL']),A('Применить WHERE status=WORK','После WHERE','branch_id|request_id',['B4|R4'])],
[A('Построить строки LEFT JOIN','Соединение','branch_id|request_id',['B4|R4','B5|NULL']),A('Посчитать строки и известные ключи','Результат GROUP BY','branch_id|COUNT(*)|COUNT(r.id)',['B4|1|1','B5|1|0'])],
[A('Сгруппировать по клиенту и статусу','Другая гранулярность','client_id|status_id|count',['C8|NEW|1','C8|WORK|1']),A('Вернуть контракт одной строки на клиента','Отчёт по клиенту','client_id|count',['C8|2'])],
[A('Проверить отсутствие сирот','Сироты','request_no',[]),A('Сверить клиента с источником','Несоответствие','request_no|actual_code|source_code',['Q1|K4|K6'])]
],
[
[A('Изменить базовый статус Q9','requests','id PK|status',['Q9|CLOSED']),A('Повторно прочитать VIEW в новой транзакции','v_new','id|status',[])],
[A('Создать VIEW с SELECT *','Неоговорённая проекция','request_no|branch_code|client_phone',['Q1|B8|+7…']),A('Явно задать контракт колонок','v_requests','request_no|branch_code',['Q1|B8'])],
[A('Сравнить клиента с источником','v_bad_client','request_no',[]),A('Выполнить отдельную проверку даты','Нарушение даты','request_no|date_text|rule',['Q1|2026-02-30|INVALID_DATE'])],
[A('Сохранить пустой филиал через LEFT','Строки соединения','branch_id|request_id',['B4|R4','B5|NULL']),A('Считать правый ключ','v_branch_count','branch_id|request_count',['B4|1','B5|0'])],
[A('Соединить работы и детали','Все пары','work_id|part_id',['W1|D1','W1|D2','W1|D3','W2|D1','W2|D2','W2|D3']),A('Агрегировать дочерние наборы отдельно','Одна строка на заявку','request_id|work_count|part_count',['Q1|2|3'])],
[A('Проверить право на VIEW','Путь вызова','account|object|privilege',['reader|v_requests|SELECT']),A('Проверить внутренний контекст','Чтение базовой таблицы','security|account|result',['DEFINER|report_owner|разрешено при заданных правах','INVOKER|reader|нет SELECT на requests'])],
[A('Получить агрегатную строку','v_counts','branch_id|n',['B4|2']),A('Направить вставку в базовый интерфейс','Операции','target|INSERT|basis',['v_counts|недопустим|GROUP BY не задаёт базовую строку','requests|через согласованный интерфейс|нужны поля конкретной заявки'])],
[A('Прочитать сохранённый DEFINER','Контекст VIEW','view|definer|exists',['v_requests|old_owner@localhost|нет']),A('Согласовать определителя и испытать чтение','Проверка поставки','account|action|evidence',['целевой reader|SELECT v_requests|успех после настройки корректного владельца и прав'])]
],
[
[A('Изменить статус внутри транзакции','Неподтверждённые эффекты','request|status|works|audit',['Q1|CLOSED|0|1']),A('Обработать ошибку FK и откатить','После ROLLBACK','request|status|works|audit',['Q1|WORK|0|0'])],
[A('Подтвердить UPDATE в соединении B','Состояние B','request|status|transaction',['Q2|CLOSED|COMMIT B']),A('Откатить независимую транзакцию A','После ROLLBACK A','request|status|owner',['Q2|CLOSED|подтверждённая транзакция B'])],
[A('Сверить контрольную сумму до COMMIT','Постусловие операции','operation|expected|actual',['OP1|100|150']),A('Откатить невыполненное постусловие','После ROLLBACK','request_status|new_works',['WORK|0'])],
[A('Вставить W2, затем получить дубликат W1','Внутри транзакции','code|state',['W1|исходная строка','W2|первая вставка ещё не подтверждена']),A('Откатить всю операцию','После ROLLBACK','id PK|code UNIQUE',['1|W1'])],
[A('Перейти в EXIT HANDLER','Обработка отказа','event|handler_action',['SQL exception|ROLLBACK']),A('Передать отказ вызывающему','Завершение вызова','data|signal',['частичные изменения отсутствуют|RESIGNAL сохраняет ошибку'])],
[A('Выполнить условный UPDATE','Результат перехода','request|old_status|ROW_COUNT()',['Q1|CLOSED|0']),A('Остановить недопустимый переход','Состояние после отказа','request|status|new_works',['Q1|CLOSED|0'])],
[A('Выполнить UPDATE и AFTER-триггер','Внутри транзакции','request|status|new_audit_rows',['Q1|CLOSED|1']),A('Откатить InnoDB-транзакцию','После ROLLBACK','request|status|new_audit_rows',['Q1|WORK|0'])],
[A('Вызвать отказ второго шага','Неподтверждённые эффекты','status|works|audit',['CLOSED|0|1']),A('Сравнить все таблицы после отката','Сверка до/после','table|before|after',['requests|WORK|WORK','completed_works|0|0','status_audit|0|0'])]
],
[
[A('Вывести порядок ключа из условия','Кандидат индекса','position|column|predicate',['1|branch_id|равенство','2|received_at|диапазон']),A('Проверить выбранный доступ','Условия проверки','query|data|evidence',['тот же WHERE|тот же репрезентативный набор|EXPLAIN и отдельное измерение'])],
[A('Посчитать совпадения и общее число','Распределение','matched|other|total',['18000|6000|24000']),A('Вычислить долю совпадений','Доля','formula|fraction|percent',['18000 / 24000|0.75|75%'])],
[A('Прочитать порядок B-tree','Порядок ключа','first|second',['branch_id|received_at']),A('Сопоставить с запросом по дате','Доступ по условию','leading_equality|ordinary_left_prefix_range|next_action',['нет|не задан|получить фактический план и сравнить альтернативы'])],
[A('Сверить существующий UNIQUE','SHOW INDEX','key_name|column|non_unique',['uq_code|code|0']),A('Сопоставить новый индекс с доступом','Решение по дублю','proposed|existing_access|decision',['INDEX(code)|UNIQUE(code)|не добавлять без отличающейся пользы'])],
[A('Завершить DML отдельно','Граница DML','session|transaction',['учебная сессия|явно завершена до DDL']),A('Создать индекс отдельным этапом','Метаданные индекса','name|columns|rollback_assumption',['ix_branch_date|branch_id,received_at|общий ROLLBACK DML не обещан'])],
[A('Прочитать оценку узла EXPLAIN','Оценка','metric|value',['estimated rows|50']),A('Сопоставить с фактом и его единицей','Разные метрики','estimated access|returned rows|measured_time',['50|7|нужно измерить отдельно'])],
[A('Сопоставить чтение и запись','Нагрузка','operation|change',['report SELECT|чтение дешевле','bulk INSERT|поддержание индекса дороже']),A('Принять решение по всей нагрузке','Основание решения','factor|required_evidence',['частоты|число чтений и записей','стоимость|измерения и хранение','индекс|вывод по совокупной нагрузке'])],
[A('Восстановить условия опыта','Опыт','query|rows|predicate',['branch + date|24000|точные параметры']),A('Заполнить проверяемый реестр','index_registry','index_name|query|dataset|evidence',['ix_branch_date|сохранён точный SELECT|объём и распределение|планы и измерения до/после'])]
],
[
[A('Вывести право из операции','Необходимое действие','account|operation|object',['reader|SELECT|v_report']),A('Выдать право на нужный объект','Матрица прав','object|SELECT|UPDATE|DELETE',['v_report|да|нет|нет','requests|нет|нет|нет'])],
[A('Прочитать активные роли соединения','Контекст','assigned_role|CURRENT_ROLE()',['reader|NONE']),A('Активировать назначенную роль','Контекст после SET ROLE','active_role|SELECT v_report',['reader|разрешён'])],
[A('Отделить добавление от удаления','Необходимая операция','object|action',['completed_works|INSERT']),A('Выдать минимальное разрешение','Матрица','INSERT|DELETE|DDL',['да|нет|нет'])],
[A('Отозвать прямой SELECT','Пути доступа','direct|active_role',['нет SELECT|есть SELECT']),A('Проверить оставшийся путь','Эффективный доступ','SELECT v_report|source',['разрешён|активная роль reader'])],
[A('Прочитать телефон в обход VIEW','Прямой запрос','id|phone',['17|+7…']),A('Устранить обходной маршрут','Согласованный доступ','object|SELECT',['v_clients_public|да','clients|нет'])],
[A('Открыть соединение редактора','Контекст проверки','CURRENT_USER()',['editor@localhost']),A('Испытать INSERT от редактора','Протокол доступа','user|operation|evidence',['editor|INSERT completed_works|ожидаемый успех и проверенный эффект'])],
[A('Устранить синтаксическую ошибку','Корректная команда','statement',["DELETE FROM requests WHERE id=-1"]),A('Испытать запрет по правильной причине','Негативный тест','statement_valid|result|expected_cause',['да|отказ|DELETE denied'])],
[A('Прочитать разрешённое VIEW','Позитивный маршрут','account|object|result',['reader|v_report|успех']),A('Проверить запрещённую базовую таблицу','Негативный маршрут','account|object|result',['reader|requests|отказ по правам'])]
],
[
[A('Сверить состав копии','Требуемые объекты','type|included',['TABLE + rows|проверить','VIEW|обязателен','PROCEDURE + TRIGGER|обязательны']),A('Восстановить полный согласованный состав','План восстановления','phase|check',['структура|имена и определения','данные|значения по ключам','поведение|контрольные вызовы'])],
[A('Найти причину отказа routines','Причина','object|operation|result',['процедуры|чтение определения|недостаточно прав']),A('Согласовать минимальные права','Условия повторного dump','version|parameters|privileges',['версия стенда|--routines и остальные параметры|минимум для обязательного состава'])],
[A('Найти конфликтующий DDL','Параллельные действия','dump|other_session',['--single-transaction|ALTER TABLE']),A('Организовать окно согласованности','Условия копии','transactional_data|conflicting_DDL',['согласованный снимок InnoDB|исключён на время копирования'])],
[A('Прочитать квалифицированную ссылку VIEW','Скрытый старый источник','view_schema|table_schema',['restore_copy|service_training']),A('Восстановить в отдельный экземпляр','Цель проверки','server|schema|data_source',['изолированный|service_training|восстановленная requests'])],
[A('Сравнить множества имён','Расхождение состава','missing|unexpected',['requests|unrelated']),A('Сверить определения нужных объектов','Приёмка объектов','check|evidence',['имена|полное совпадение ожидаемого множества','определения|SHOW CREATE каждого существенного объекта'])],
[A('Сопоставить строку по ключу','Различие значений','request_id|part_id|source_qty|restored_qty',['Q1|D2|4|5']),A('Зафиксировать непригодное восстановление','Результат приёмки','key|state|action',['Q1,D2|не совпадает qty|диагностировать копию и повторить restore'])],
[A('Прочитать DEFINER процедуры','Контекст исполнения','procedure|definer_exists',['close_request|нет']),A('Испытать поведение после настройки','Проверка процедуры','route|evidence',['успех|ожидаемые связанные изменения','отказ|откат всех эффектов и сообщение ошибки'])],
[A('Сравнить SHA-256 при передаче','Целостность файла','sent|received|equal',['H1|H1|да']),A('Отдельно испытать восстановление','Разные свидетельства','claim|evidence',['те же байты|SHA-256','восстановимость|restore и проверки объектов, данных, поведения'])]
],
[
[A('Сравнить ревизии комплекта','Несогласованный набор','DDL|ER|load_test',['3|2|1']),A('Совместно испытать одну ревизию','Согласованный комплект','DDL|ER|load_and_check',['3|3 после сверки|испытаны с DDL 3'])],
[A('Восстановить судьбу шести строк','Баланс происхождения','source|accepted|rejected',['6|3|3']),A('Передать непринятые факты с причинами','Протокол отклонений','source_row|reason',['4|missing client','5|invalid date','6|duplicate key'])],
[A('Сверить новое ограничение DDL','Фактическое свойство','table|column|constraint',['parts|code|UNIQUE']),A('Согласовать поставочную ER','Атрибут модели','table|column|uniqueness',['parts|code|UNIQUE как в DDL'])],
[A('Вывести порядок из зависимостей','Граф поставки','child|requires',['load.sql|init.sql','views.sql|состояние после load.sql по заданному маршруту']),A('Запустить по согласованному маршруту','Порядок','step|script',['1|init.sql','2|load.sql','3|views.sql','4|контрольные запросы'])],
[A('Выполнить поиск ненулевых сирот','Контрольный результат','request_id',[]),A('Привязать вывод к запросу и данным','Свидетельство','claim|expected|actual',['нет сирот в данном состоянии|0 строк|0 строк'])],
[A('Восстановить условия создания dump','Контекст копии','required|purpose',['версия и параметры|повторить создание','состав объектов|проверить достаточность']),A('Испытать копию по переданному маршруту','Протокол восстановления','target|checks',['отдельная цель|состав, данные, поведение'])],
[A('Удалить действующий пароль из примера','Шаблон подключения','user|password',['training_reader|<LOCAL_SECRET>']),A('Получить секрет локально','Команда подключения','command',['mysql --host=127.0.0.1 --user=training_reader --password'])],
[A('Развернуть распакованный архив','Маршрут','source|target',['именно передаваемый архив|чистая учебная цель']),A('Проверить полный результат','Приёмка','component|evidence',['структура|DDL соответствует ER','данные|баланс, ключи, значения, связи','поведение|успех, отказ и откат','доступ и копия|испытаны от целевых пользователей и в restore'])]
]
];
function makeVariant(model,actions,label='Исходные условия',id='base'){
 let tables=clone(model.tables).map(t=>({...t,rows:t.result?[]:t.rows,result:false}));
 const stages=[{title:'Исходные данные',action:'Начало',explanation:model.trace[0],sql:'',tables:clone(tables),links:clone(model.links),result:null}];
 for(const [i,a] of actions.entries()){
  const match=tables.findIndex(t=>t.name===a.result.name);
  if(match>=0)tables[match]=clone(a.result);
  stages.push({title:a.action,action:a.action,explanation:model.trace[Math.min(i+1,2)],sql:a.sql||model.sql,tables:clone(tables),links:clone(model.links),result:clone(a.result)});
 }
 return {id,label,stages};
}
const join=(left,right,kind)=>left.flatMap(l=>{const rs=right.filter(r=>r[1]===l);return rs.length?rs.map(r=>[l,r[0]]):kind==='LEFT'?[[l,'NULL']]:[]});
export function practicalCase(li,qi,model){
 const actions=clone(recipes[li]?.[qi]);if(!actions)throw Error('Missing practical actions '+li+':'+qi);
 if(li===6&&qi===0){actions[0].sql='SELECT r.id,p.part_id FROM requests r JOIN request_parts p ON p.request_id=r.id;';actions[1].sql='SELECT COUNT(*),COUNT(DISTINCT r.id) FROM requests r JOIN request_parts p ON p.request_id=r.id;';}
 if(li===6&&[4,5].includes(qi))actions[0].sql='SELECT b.id,r.id FROM branches b LEFT JOIN requests r ON r.branch_id=b.id;';
 if(li===7&&qi===1){actions[0].sql='CREATE VIEW v_requests AS SELECT * FROM requests;';actions[1].sql='CREATE OR REPLACE VIEW v_requests AS SELECT request_no,branch_code FROM requests;';}
 if(li===7&&qi===3)actions[0].sql='SELECT b.id,r.id FROM branches b LEFT JOIN requests r ON r.branch_id=b.id;';
 if(li===7&&qi===4)actions[1].sql='SELECT r.id,w.n AS work_count,p.n AS part_count\nFROM requests r\nLEFT JOIN (SELECT request_id,COUNT(*) AS n FROM works GROUP BY request_id) w ON w.request_id=r.id\nLEFT JOIN (SELECT request_id,COUNT(*) AS n FROM parts_used GROUP BY request_id) p ON p.request_id=r.id;';
 const variants=[makeVariant(model,actions)];
 // Relational operations are computed from the displayed rows for each alternative.
 if(li===6&&[1,4,5].includes(qi)){
  const left=qi===1?['C8','C9']:['B4','B5'],right=qi===1?[['O1','C8'],['O2','C8']]:[['R4','B4']];
  const pairs=join(left,right,'LEFT');
  if(qi===1)variants[0]=makeVariant(model,[A('Получить пары INNER JOIN','Результат INNER','client_id|order_id',join(left,right,'INNER').map(r=>r.join('|'))),A('Посчитать строки результата','Количество строк','COUNT(*)',[String(join(left,right,'INNER').length)])],'INNER JOIN');
  const extra=qi===5?[['R4','B4'],['R5','B5']]:right,extraPairs=join(left,extra,'LEFT');
  const alt=qi===5?[A('Добавить R5 для B5','requests','id PK|branch_id FK',extra.map(r=>r.join('|'))),A('Пересчитать агрегаты','GROUP BY','branch_id|COUNT(*)|COUNT(r.id)',left.map(id=>[id,extraPairs.filter(r=>r[0]===id).length,extraPairs.filter(r=>r[0]===id&&r[1]!=='NULL').length].join('|')))]:[A(qi===1?'Получить пары LEFT JOIN':'Отбирать статус в ON','Результат LEFT','parent_id|child_id',pairs.map(r=>r.join('|'))),A('Сравнить состав результата','Состав','parent_id|child_id',pairs.map(r=>r.join('|')))];
  const altSql=qi===1?'SELECT c.id,o.id FROM clients c LEFT JOIN orders o ON o.client_id=c.id;':qi===4?"SELECT b.id,r.id FROM branches b LEFT JOIN requests r ON r.branch_id=b.id AND r.status='WORK';":'SELECT b.id,COUNT(*),COUNT(r.id) FROM branches b LEFT JOIN requests r ON r.branch_id=b.id GROUP BY b.id;';
  for(const a of alt)a.sql=altSql;
  if(qi===5)alt[0].sql="INSERT INTO requests(id,branch_id) VALUES('R5','B5');";
  variants.push(makeVariant(model,alt,qi===1?'LEFT JOIN':qi===4?'Фильтр статуса в ON':'У B5 появилась заявка R5','changed'));
 }
 if(li===8&&[0,2,3,4,6,7].includes(qi)){
  const before=T('requests','id PK|status',['Q1|WORK']),works=T('completed_works','request_id FK|type_id FK',[]),audit=T('status_audit','request_id FK|event',[]);
  const txModel={...model,tables:[before,works,audit],links:[{from:0,to:1,label:'requests.id → completed_works.request_id'},{from:0,to:2,label:'UPDATE requests → AFTER-триггер → status_audit'}]};
  function tx(success){const v=makeVariant(txModel,[A('Выполнить UPDATE requests','requests','id PK|status',['Q1|CLOSED'],"UPDATE requests SET status='CLOSED' WHERE id='Q1';"),A('Выполнить AFTER-триггер','status_audit','request_id FK|event',['Q1|WORK → CLOSED']),A(success?'Добавить допустимую работу':'Получить отказ второго шага',success?'completed_works':'Ошибка оператора',success?'request_id FK|type_id FK':'operation|error',success?['Q1|1']:['INSERT completed_works|FK: type_id=999 отсутствует']),A(success?'Подтвердить COMMIT':'Откатить всю операцию', 'Итог транзакции','status|new_works|new_audit|end',[success?'CLOSED|1|1|COMMIT':'WORK|0|0|ROLLBACK'],success?'COMMIT;':'ROLLBACK;\nRESIGNAL;')],success?'Допустимая работа: COMMIT':'Отказ FK: ROLLBACK',success?'success':'base');
   v.stages[0].explanation=success?'В этом варианте type_id=1 существует; вставка работы допустима. Начинаем с WORK, без новой работы и аудита.':'В этом варианте type_id=999 отсутствует. Начинаем с WORK, без новой работы и аудита.';
   const last=v.stages.at(-1);last.tables=success?[T('requests','id PK|status',['Q1|CLOSED']),T('completed_works','request_id FK|type_id FK',['Q1|1']),T('status_audit','request_id FK|event',['Q1|WORK → CLOSED'])]:[before,works,audit];
   v.stages[1].sql="START TRANSACTION;\nUPDATE requests SET status='CLOSED' WHERE id='Q1';";
   v.stages[1].explanation='Текущая сессия изменила статус Q1 на CLOSED. Изменение ещё не подтверждено; работа пока не добавлена.';
   v.stages[2].sql="-- Тело AFTER UPDATE-триггера; он вызывается внутри UPDATE\nINSERT INTO status_audit(request_id,event) VALUES('Q1','WORK → CLOSED');";
   v.stages[2].explanation='AFTER UPDATE автоматически записывает смену WORK → CLOSED. Это часть того же оператора и транзакции; отдельного COMMIT у триггера нет.';
   v.stages[3].sql="INSERT INTO completed_works(request_id,type_id) VALUES('Q1',"+(success?'1':'999')+");";
   v.stages[3].explanation=success?'Родитель type_id=1 существует: добавлена работа Q1. Статус, работа и аудит пока находятся в одной неподтверждённой транзакции.':'FK отвергает type_id=999. Работа не добавлена, но предыдущее изменение статуса и аудит ещё требуют полного отката.';
   last.sql=success?'COMMIT;':'ROLLBACK;\n-- В EXIT HANDLER процедуры после отката: RESIGNAL;';
   last.explanation=success?'COMMIT совместно подтверждает CLOSED, одну новую работу и одну запись аудита.':'ROLLBACK отменяет статус и аудит вместе с остальной операцией. Q1 снова WORK; новой работы и нового события нет.';
   return v;}
  // Only the FK operation uses this variation; other topics retain their own conditions.
  if([0,7].includes(qi))variants.splice(0,variants.length,tx(false),tx(true));
 }
 if(li===7&&qi===0){
  const v=variants[0];for(const stage of v.stages)stage.links=[{from:0,to:1,label:'SELECT из requests WHERE status=NEW'}];v.stages[0].tables=[T('requests','id PK|status',['Q9|NEW']),T('v_new','id|status',['Q9|NEW'])];v.stages[1].tables=[T('requests','id PK|status',['Q9|CLOSED']),T('v_new: предыдущее чтение','id|status',['Q9|NEW'])];v.stages[1].explanation='UPDATE меняет базовую строку. Подтверждаем изменение; прежний показанный результат не является отдельной таблицей данных VIEW.';v.stages[1].sql="UPDATE requests SET status='CLOSED' WHERE id='Q9';\nCOMMIT;";v.stages[2].tables=[T('requests','id PK|status',['Q9|CLOSED']),T('v_new: новое чтение','id|status',[])];v.stages[2].explanation='В новом обычном чтении после подтверждения CLOSED не проходит status=NEW. Запрос возвращает ноль строк.';
 }
 if(li===7&&qi===4){const pairs=['W1','W2'].flatMap(w=>['D1','D2','D3'].map(d=>'Q1|'+w+'|'+d));variants[0].stages[1].result=T('Пары двух дочерних наборов','request_id|work_id|part_id',pairs);}
 if(li===9&&qi===1){
  for(const matched of [6000,1200]){const percent=matched/24000*100;const m={...model,links:[],trace:[`В этом варианте ${matched} строк NEW из 24000. Остальные ${24000-matched} не проходят предикат.`, 'Считаем совпавшие строки и общий объём одного набора.',`${matched} / 24000 = ${matched/24000} = ${percent}%. Это доля совпадений, не время выполнения.`],tables:[T('requests: распределение','status|rows',[`NEW|${matched}`,`остальные|${24000-matched}`])]};variants.push(makeVariant(m,[A('Посчитать совпадения','Распределение','matched|total',[matched+'|24000']),A('Рассчитать долю','Результат','fraction|percent',[(matched/24000)+'|'+percent+'%'],`SELECT ${matched}/24000 AS fraction,100*${matched}/24000 AS percent;`)],`${matched} совпадений из 24000`,'n'+matched));}
 }
 return {variants};
}
