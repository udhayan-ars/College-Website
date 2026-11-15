-- Smart Hostel Management System - MySQL 8 / MariaDB 10.5+ schema
CREATE DATABASE IF NOT EXISTS smart_hostel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_hostel;

CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  gender ENUM('Boys','Girls') NOT NULL,
  dept VARCHAR(50) NOT NULL,
  year_of_study VARCHAR(10) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(120) NULL,
  parent_info VARCHAR(255) NOT NULL,
  emergency_contact VARCHAR(20) NULL,
  joined_on DATE NOT NULL,
  status ENUM('Inside','College','On Leave','Home','Absent') NOT NULL DEFAULT 'Inside',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_students_gender (gender),
  INDEX idx_students_status (status),
  INDEX idx_students_dept (dept)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role ENUM('admin','warden','staff','student') NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  hostel ENUM('Boys','Girls') NULL,
  student_id VARCHAR(20) NULL UNIQUE,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_no VARCHAR(20) NOT NULL UNIQUE,
  hostel ENUM('Boys','Girls') NOT NULL,
  floor INT NOT NULL DEFAULT 0,
  capacity INT NOT NULL DEFAULT 2,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rooms_hostel (hostel)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS room_allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  room_id INT NOT NULL,
  checked_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checked_out_at DATETIME NULL,
  INDEX idx_alloc_student (student_id, checked_out_at),
  INDEX idx_alloc_room (room_id, checked_out_at),
  CONSTRAINT fk_alloc_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_alloc_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS biometric_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  device_id VARCHAR(30) NOT NULL,
  event_type ENUM('ENTRY','EXIT') NOT NULL,
  result ENUM('SUCCESS','FAILED') NOT NULL,
  event_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bio_student_time (student_id, event_time),
  INDEX idx_bio_time (event_time),
  CONSTRAINT fk_bio_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

DROP TRIGGER IF EXISTS biometric_no_update;
CREATE TRIGGER biometric_no_update BEFORE UPDATE ON biometric_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Biometric records are protected';
DROP TRIGGER IF EXISTS biometric_no_delete;
CREATE TRIGGER biometric_no_delete BEFORE DELETE ON biometric_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Biometric records are protected';

CREATE TABLE IF NOT EXISTS leaves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  depart_at DATETIME NOT NULL,
  return_at DATETIME NOT NULL,
  destination VARCHAR(255) NOT NULL,
  status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  decided_by INT NULL,
  decided_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_leaves_student (student_id),
  INDEX idx_leaves_status (status),
  CONSTRAINT fk_leaves_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_leaves_user FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description VARCHAR(1000) NOT NULL,
  status ENUM('Pending','In Progress','Resolved') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_complaints_status (status),
  CONSTRAINT fk_complaints_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS emergencies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  expected_return DATETIME NOT NULL,
  status ENUM('Pending','Approved','Rejected','Returned') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_emerg_status (status),
  CONSTRAINT fk_emerg_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hostel ENUM('All','Boys','Girls') NOT NULL DEFAULT 'All',
  message VARCHAR(1000) NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notices_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mess_menu (
  meal ENUM('Breakfast','Lunch','Snacks','Dinner') PRIMARY KEY,
  serving_time VARCHAR(30) NOT NULL,
  items VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sort_order INT NOT NULL DEFAULT 0,
  rule_text VARCHAR(500) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(50) NOT NULL,
  details VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
