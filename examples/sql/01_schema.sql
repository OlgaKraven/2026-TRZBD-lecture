-- Учебный стенд. Запускать только в новой отдельной схеме.
-- CREATE DATABASE намеренно завершится отказом, если цель уже существует.
CREATE DATABASE service_training CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE service_training;
CREATE TABLE branches (id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, code VARCHAR(8) NOT NULL UNIQUE, name VARCHAR(80) NOT NULL) ENGINE=InnoDB;
CREATE TABLE clients (id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, code VARCHAR(8) NOT NULL UNIQUE, name VARCHAR(80) NOT NULL) ENGINE=InnoDB;
CREATE TABLE request_statuses (id BIGINT UNSIGNED PRIMARY KEY, code VARCHAR(8) NOT NULL UNIQUE, name VARCHAR(40) NOT NULL) ENGINE=InnoDB;
CREATE TABLE parts (id BIGINT UNSIGNED PRIMARY KEY, code VARCHAR(8) NOT NULL UNIQUE, name VARCHAR(60) NOT NULL) ENGINE=InnoDB;
CREATE TABLE work_types (code VARCHAR(12) PRIMARY KEY, name VARCHAR(60) NOT NULL) ENGINE=InnoDB;
CREATE TABLE requests (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
 request_no VARCHAR(24) NOT NULL UNIQUE,
 client_id BIGINT UNSIGNED NOT NULL,
 branch_id BIGINT UNSIGNED NOT NULL,
 status_id BIGINT UNSIGNED NOT NULL,
 received_at DATETIME NOT NULL,
 CONSTRAINT chk_request_no CHECK (CHAR_LENGTH(TRIM(request_no)) > 0),
 CONSTRAINT fk_requests_client FOREIGN KEY (client_id) REFERENCES clients(id),
 CONSTRAINT fk_requests_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
 CONSTRAINT fk_requests_status FOREIGN KEY (status_id) REFERENCES request_statuses(id)
) ENGINE=InnoDB;
CREATE TABLE request_parts (
 request_id BIGINT UNSIGNED NOT NULL, part_id BIGINT UNSIGNED NOT NULL, quantity INT NOT NULL,
 PRIMARY KEY(request_id,part_id), CONSTRAINT chk_quantity CHECK(quantity > 0),
 FOREIGN KEY(request_id) REFERENCES requests(id), FOREIGN KEY(part_id) REFERENCES parts(id)
) ENGINE=InnoDB;
CREATE TABLE completed_works (
 request_id BIGINT UNSIGNED NOT NULL, work_code VARCHAR(12) NOT NULL,
 PRIMARY KEY(request_id,work_code),
 FOREIGN KEY(request_id) REFERENCES requests(id), FOREIGN KEY(work_code) REFERENCES work_types(code)
) ENGINE=InnoDB;
CREATE TABLE audit_request_status (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, request_id BIGINT UNSIGNED NOT NULL,
 old_status_id BIGINT UNSIGNED NOT NULL, new_status_id BIGINT UNSIGNED NOT NULL,
 changed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 FOREIGN KEY(request_id) REFERENCES requests(id)
) ENGINE=InnoDB;
-- Staging хранит сырые строки и их происхождение, а не навязывает целевые типы.
CREATE TABLE stage_branches (source_row INT PRIMARY KEY AUTO_INCREMENT, code TEXT, name TEXT) ENGINE=InnoDB;
CREATE TABLE stage_clients (source_row INT PRIMARY KEY AUTO_INCREMENT, code TEXT, name TEXT) ENGINE=InnoDB;
CREATE TABLE stage_requests (source_row INT PRIMARY KEY AUTO_INCREMENT, request_no TEXT, client_code TEXT, branch_code TEXT, status_code TEXT, received_at TEXT, part_codes TEXT) ENGINE=InnoDB;
CREATE TABLE load_rejections (source_row INT PRIMARY KEY, reason VARCHAR(80) NOT NULL) ENGINE=InnoDB;
