USE service_training;
SELECT (SELECT COUNT(*) FROM stage_requests) AS input_rows,
 (SELECT COUNT(*) FROM requests) AS accepted,
 (SELECT COUNT(*) FROM load_rejections) AS rejected;
SELECT source_row,reason FROM load_rejections ORDER BY source_row;
SELECT r.request_no,c.code AS client_code,b.code AS branch_code,st.code AS status_code
 FROM requests r JOIN clients c ON c.id=r.client_id JOIN branches b ON b.id=r.branch_id
 JOIN request_statuses st ON st.id=r.status_id ORDER BY r.request_no;
SELECT COUNT(*) AS orphan_requests FROM requests r LEFT JOIN clients c ON c.id=r.client_id WHERE c.id IS NULL;
-- Проверка существования родителя не заменяет проверку правильности сопоставления.
SELECT s.request_no AS mismatch FROM stage_requests s JOIN requests r ON r.request_no=s.request_no
 JOIN clients c ON c.id=r.client_id JOIN branches b ON b.id=r.branch_id JOIN request_statuses st ON st.id=r.status_id
 WHERE NOT EXISTS(SELECT 1 FROM load_rejections e WHERE e.source_row=s.source_row)
 AND (c.code<>s.client_code OR b.code<>s.branch_code OR st.code<>s.status_code OR r.received_at<>CAST(s.received_at AS DATETIME));
SELECT b.code,COUNT(r.id) AS request_count FROM branches b LEFT JOIN requests r ON r.branch_id=b.id
 GROUP BY b.id,b.code ORDER BY b.code;
SELECT r.request_no,p.code,rp.quantity FROM request_parts rp JOIN requests r ON r.id=rp.request_id JOIN parts p ON p.id=rp.part_id ORDER BY r.request_no,p.code;
