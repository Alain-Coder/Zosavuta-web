-- Add customer_organizer dual-role option
ALTER TABLE users
  MODIFY COLUMN role ENUM('customer','organizer','customer_organizer','admin') NOT NULL DEFAULT 'customer';
