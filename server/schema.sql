CREATE DATABASE IF NOT EXISTS shelf_life_db;
USE shelf_life_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NULL,
  google_id VARCHAR(100) UNIQUE NULL,
  role VARCHAR(50) DEFAULT 'user',
  reset_token VARCHAR(255) NULL,
  reset_token_expires TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- LOGIN, SIGNUP, LOGOUT
  device_info VARCHAR(255) NOT NULL,
  ip_address VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_timestamp ON user_activity(timestamp);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_name VARCHAR(150) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL, -- Pickle, Powder, Ready Mix, Snacks
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  batch_number VARCHAR(50) NOT NULL,
  manufacturing_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  quantity INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_batches_product_id ON product_batches(product_id);

CREATE TABLE IF NOT EXISTS product_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  action VARCHAR(50) NOT NULL, -- ADDED, UPDATED, DELETED
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_activity_product_id ON product_activity(product_id);
CREATE INDEX idx_product_activity_timestamp ON product_activity(timestamp);

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
  FOREIGN KEY (batch_id) REFERENCES product_batches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
