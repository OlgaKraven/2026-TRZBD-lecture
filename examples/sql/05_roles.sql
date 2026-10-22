CREATE ROLE IF NOT EXISTS 'trzbd_viewer','trzbd_editor','trzbd_schema_admin';
GRANT SELECT ON service_training.v_open_requests TO 'trzbd_viewer';
-- Роль editor изменяет только работы, а не статус заявки или структуру схемы.
GRANT SELECT,INSERT,UPDATE ON service_training.completed_works TO 'trzbd_editor';
GRANT CREATE,ALTER,INDEX,CREATE VIEW,SHOW VIEW ON service_training.* TO 'trzbd_schema_admin';
-- Создание пользовательских записей и локальный ввод пароля описаны в README стенда.
-- GRANT 'trzbd_viewer' TO 'training_operator'@'localhost';
-- SET DEFAULT ROLE 'trzbd_viewer' TO 'training_operator'@'localhost';
-- В новой сессии: SELECT CURRENT_ROLE(); SELECT * FROM service_training.v_open_requests;
