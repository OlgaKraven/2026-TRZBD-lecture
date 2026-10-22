USE service_training;
-- Выделенный владелец view не может входить в систему; у него только чтение отдельной учебной схемы.
CREATE USER IF NOT EXISTS 'trzbd_view_owner'@'localhost' ACCOUNT LOCK;
GRANT SELECT ON service_training.* TO 'trzbd_view_owner'@'localhost';
CREATE DEFINER='trzbd_view_owner'@'localhost' SQL SECURITY DEFINER VIEW v_open_requests AS
 SELECT r.request_no,b.code AS branch_code,r.received_at FROM requests r
 JOIN branches b ON b.id=r.branch_id JOIN request_statuses s ON s.id=r.status_id WHERE s.code<>'CLOSED';
CREATE SQL SECURITY INVOKER VIEW v_branch_counts AS
 SELECT b.code,COUNT(r.id) AS request_count FROM branches b LEFT JOIN requests r ON r.branch_id=b.id GROUP BY b.id,b.code;
DELIMITER $$
CREATE TRIGGER audit_status AFTER UPDATE ON requests FOR EACH ROW
BEGIN
 IF OLD.status_id <> NEW.status_id THEN
  INSERT INTO audit_request_status(request_id,old_status_id,new_status_id) VALUES(NEW.id,OLD.status_id,NEW.status_id);
 END IF;
END$$
CREATE PROCEDURE close_request(IN p_request_id BIGINT UNSIGNED,IN p_work_code VARCHAR(12))
SQL SECURITY INVOKER
BEGIN
 DECLARE v_closed BIGINT UNSIGNED;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 -- Процедура владеет транзакцией; вызывается вне уже начатой транзакции.
 START TRANSACTION;
 SELECT id INTO v_closed FROM request_statuses WHERE code='CLOSED';
 UPDATE requests SET status_id=v_closed WHERE id=p_request_id AND status_id<>v_closed;
 IF ROW_COUNT()<>1 THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Заявка отсутствует или уже закрыта';
 END IF;
 -- Ошибка FK здесь намеренно проверяется тестом: UPDATE и триггер должны откатиться.
 INSERT INTO completed_works(request_id,work_code) VALUES(p_request_id,p_work_code);
 COMMIT;
END$$
DELIMITER ;
CREATE SQL SECURITY INVOKER VIEW v_source_mismatch AS
 SELECT s.request_no,s.client_code AS expected,c.code AS actual
 FROM stage_requests s JOIN requests r ON r.request_no=s.request_no
 JOIN clients c ON c.id=r.client_id
 WHERE NOT EXISTS(SELECT 1 FROM load_rejections e WHERE e.source_row=s.source_row)
 AND c.code<>s.client_code;
