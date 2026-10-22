USE service_training;
-- Отдельная таблица: не меняет три заявки основного примера.
CREATE TABLE requests_plan (
 id INT PRIMARY KEY, request_no VARCHAR(24) NOT NULL UNIQUE,
 branch_id INT NOT NULL, status_id INT NOT NULL, received_at DATETIME NOT NULL
) ENGINE=InnoDB;
SET SESSION cte_max_recursion_depth=10001;
INSERT INTO requests_plan
 WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n<10000)
 SELECT n,CONCAT('P',LPAD(n,5,'0')),MOD(n,100)+1,MOD(n,3)+1,
 DATE_ADD('2026-01-01 00:00:00',INTERVAL n MINUTE) FROM seq;
ANALYZE TABLE requests_plan;
EXPLAIN SELECT request_no FROM requests_plan WHERE branch_id=42 AND status_id=1 ORDER BY received_at;
CREATE INDEX idx_plan_branch_status_date ON requests_plan(branch_id,status_id,received_at);
EXPLAIN SELECT request_no FROM requests_plan WHERE branch_id=42 AND status_id=1 ORDER BY received_at;
