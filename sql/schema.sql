-- ============================================
-- Book Binding Site — Database Schema
-- Run this against your TiDB Cloud Serverless database.
-- ============================================

-- PHASE 1: only `users` is needed for auth. Run this now.
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer', 'admin') DEFAULT 'customer',
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Everything below is for later phases (2-5).
-- Uncomment and run each block when you get to that phase,
-- so the schema always matches the current step you're building.
-- ============================================

-- PHASE 2: services + gallery
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  price_note VARCHAR(100),
  turnaround_days INT DEFAULT 3,
  image_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- A few sample services so the site isn't empty while you build. Edit or delete these later —
-- once the admin panel exists (Phase 5) you'll manage these through the UI instead.
INSERT INTO services (name, slug, description, base_price, price_note, turnaround_days, display_order) VALUES
  ('Hardcover Binding', 'hardcover-binding', 'Durable, professional hardcover binding — ideal for theses, portfolios, and keepsake books.', 450.00, 'per book', 4, 1),
  ('Softcover / Perfect Binding', 'softcover-perfect-binding', 'Clean, glued spine binding perfect for reports, manuals, and everyday documents.', 200.00, 'per book', 2, 2),
  ('Spiral Binding', 'spiral-binding', 'Quick, budget-friendly binding that lets pages lie flat — great for workbooks and presentations.', 80.00, 'per book', 1, 3),
  ('Leather-Bound Restoration', 'leather-bound-restoration', 'Careful restoration and rebinding of old or damaged leather-bound books and family heirlooms.', 1200.00, 'starting price', 7, 4);

-- Everything below is for later phases still. Uncomment and run each block when you get there.

-- PHASE 4: gallery
CREATE TABLE IF NOT EXISTS gallery_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT,
  image_url VARCHAR(255) NOT NULL,
  caption VARCHAR(200),
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
);

-- Placeholder photos so the gallery isn't empty while you build — swap these
-- for real photos of finished work through the admin panel later (Phase 9).
INSERT INTO gallery_images (image_url, caption, display_order) VALUES
  ('https://picsum.photos/seed/bookbind1/600/450', 'Hardcover finish — walnut brown', 1),
  ('https://picsum.photos/seed/bookbind2/600/450', 'Restored family bible, leather rebind', 2),
  ('https://picsum.photos/seed/bookbind3/600/450', 'Spiral-bound workbook set', 3),
  ('https://picsum.photos/seed/bookbind4/600/450', 'Perfect-bound annual report', 4),
  ('https://picsum.photos/seed/bookbind5/600/450', 'Custom gold-foil title stamping', 5),
  ('https://picsum.photos/seed/bookbind6/600/450', 'Thesis binding, university edition', 6);

-- PHASE 5: orders (order form, price estimate)
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(30) NOT NULL UNIQUE,
  customer_id INT NOT NULL,
  service_id INT NOT NULL,
  quantity INT DEFAULT 1,
  page_count INT,
  cover_type VARCHAR(50),
  cover_color VARCHAR(50),
  special_instructions TEXT,
  uploaded_file_url VARCHAR(255),
  fulfillment_type ENUM('pickup', 'local_delivery', 'shipping') NOT NULL,
  delivery_address TEXT,
  is_urgent BOOLEAN DEFAULT FALSE,
  price_estimate DECIMAL(10,2),
  final_price DECIMAL(10,2),
  payment_status ENUM('pending', 'paid', 'cod', 'failed') DEFAULT 'pending',
  payment_id VARCHAR(100),
  order_status ENUM('received', 'in_progress', 'ready', 'delivered', 'cancelled') DEFAULT 'received',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  status VARCHAR(30) NOT NULL,
  note VARCHAR(255),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Everything below is for later phases still. Uncomment and run each block when you get there.

-- PHASE 5: contact form
-- CREATE TABLE contact_messages (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   name VARCHAR(100) NOT NULL,
--   email VARCHAR(150) NOT NULL,
--   message TEXT NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
