USE service_training;
SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
-- LOCAL разрешается только для доверенного локального учебного сервера и клиента.
-- Пути относительно корня репозитория; перед запуском: node scripts/check-input.mjs.
LOAD DATA LOCAL INFILE 'examples/data/branches.csv' INTO TABLE stage_branches CHARACTER SET utf8mb4
 FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 LINES (code,name);
SHOW WARNINGS;
LOAD DATA LOCAL INFILE 'examples/data/clients.csv' INTO TABLE stage_clients CHARACTER SET utf8mb4
 FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 LINES (code,name);
SHOW WARNINGS;
LOAD DATA LOCAL INFILE 'examples/data/requests.csv' INTO TABLE stage_requests CHARACTER SET utf8mb4
 FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 LINES
 (request_no,client_code,branch_code,status_code,received_at,part_codes);
SHOW WARNINGS;
INSERT INTO branches(code,name) SELECT code,TRIM(TRAILING '\r' FROM name) FROM stage_branches ORDER BY source_row;
INSERT INTO clients(code,name) SELECT code,TRIM(TRAILING '\r' FROM name) FROM stage_clients ORDER BY source_row;
-- Справочники заданы описанием учебного случая, не угаданы по отсутствующему файлу.
INSERT INTO request_statuses VALUES(1,'NEW','Новая'),(2,'WORK','В работе'),(3,'CLOSED','Закрыта');
INSERT INTO parts VALUES(1,'P01','Учебная деталь 01'),(7,'P07','Учебная деталь 07');
INSERT INTO work_types VALUES('DIAG','Диагностика'),('REPAIR','Ремонт');
INSERT INTO load_rejections
 SELECT s.source_row,CASE
 WHEN TRIM(s.request_no)='' THEN 'EMPTY_REQUEST_NO'
 WHEN b.id IS NULL THEN 'UNKNOWN_BRANCH'
 WHEN c.id IS NULL THEN 'UNKNOWN_CLIENT'
 WHEN st.id IS NULL THEN 'UNKNOWN_STATUS'
 ELSE 'DUPLICATE_REQUEST_NO' END
 FROM stage_requests s
 LEFT JOIN branches b ON b.code=s.branch_code
 LEFT JOIN clients c ON c.code=s.client_code
 LEFT JOIN request_statuses st ON st.code=s.status_code
 WHERE TRIM(s.request_no)='' OR b.id IS NULL OR c.id IS NULL OR st.id IS NULL
 OR EXISTS(SELECT 1 FROM stage_requests earlier WHERE earlier.request_no=s.request_no AND earlier.source_row<s.source_row);
INSERT INTO requests(request_no,client_id,branch_id,status_id,received_at)
 SELECT s.request_no,c.id,b.id,st.id,CAST(s.received_at AS DATETIME)
 FROM stage_requests s JOIN clients c ON c.code=s.client_code JOIN branches b ON b.code=s.branch_code JOIN request_statuses st ON st.code=s.status_code
 WHERE NOT EXISTS(SELECT 1 FROM load_rejections e WHERE e.source_row=s.source_row) ORDER BY s.source_row;
-- По условию этого набора каждый код встречается в списке ровно один раз,
-- одна перечисленная деталь означает quantity=1. Это явное учебное допущение.
INSERT INTO request_parts(request_id,part_id,quantity)
 SELECT r.id,p.id,1 FROM stage_requests s JOIN requests r ON r.request_no=s.request_no
 JOIN parts p ON FIND_IN_SET(p.code,REPLACE(TRIM(TRAILING '\r' FROM s.part_codes),';',','))>0
 WHERE NOT EXISTS(SELECT 1 FROM load_rejections e WHERE e.source_row=s.source_row);
INSERT INTO completed_works SELECT id,'REPAIR' FROM requests WHERE request_no='R103';
