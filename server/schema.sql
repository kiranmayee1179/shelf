CREATE DATABASE IF NOT EXISTS shelf_life_db;
USE shelf_life_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NULL,
  google_id VARCHAR(100) UNIQUE NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS production_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_name VARCHAR(150) NOT NULL,
  category VARCHAR(100) NOT NULL,
  manufacturing_date DATE NOT NULL,
  shelf_life INT NOT NULL,
  expiry_date DATE NOT NULL,
  quantity INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  source VARCHAR(100) DEFAULT 'Web Dashboard',
  batch_details TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id INT PRIMARY KEY,
  reminder_threshold_days INT DEFAULT 5,
  alert_points VARCHAR(100) DEFAULT '1,3,5',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  batch_id INT NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  priority VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES production_batches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

