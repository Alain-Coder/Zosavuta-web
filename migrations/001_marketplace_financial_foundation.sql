-- Financial marketplace foundation. Run after schema.sql against the same database.
-- Existing legacy columns remain available during the application migration.

ALTER TABLE users
  ADD COLUMN accountType ENUM('ATTENDEE', 'ORGANIZER', 'ATTENDEE_ORGANIZER') NULL,
  ADD COLUMN adminRole ENUM('SYSTEM_ADMINISTRATOR', 'ACCOUNTANT') NULL;

UPDATE users SET accountType = CASE role
  WHEN 'organizer' THEN 'ORGANIZER'
  WHEN 'customer_organizer' THEN 'ATTENDEE_ORGANIZER'
  ELSE 'ATTENDEE'
END WHERE accountType IS NULL AND role IN ('customer', 'organizer', 'customer_organizer');

CREATE TABLE IF NOT EXISTS approval_records (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  adminId VARCHAR(128) NOT NULL,
  adminRole ENUM('SYSTEM_ADMINISTRATOR', 'ACCOUNTANT') NOT NULL,
  action VARCHAR(64) NOT NULL,
  targetType VARCHAR(64) NOT NULL,
  targetId VARCHAR(128) NOT NULL,
  reason TEXT,
  previousStatus VARCHAR(64),
  newStatus VARCHAR(64),
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_approval_target (targetType, targetId),
  INDEX idx_approval_admin (adminId),
  FOREIGN KEY (adminId) REFERENCES users(uid)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  orderId VARCHAR(64) NOT NULL,
  provider VARCHAR(32) NOT NULL DEFAULT 'PAYCHANGU',
  providerReference VARCHAR(255),
  idempotencyKey VARCHAR(128) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'MWK',
  status ENUM('PENDING','PROCESSING','PAID','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING',
  rawResponse JSON,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payment_provider_reference (provider, providerReference),
  UNIQUE KEY uq_payment_idempotency (idempotencyKey),
  INDEX idx_payment_order (orderId),
  FOREIGN KEY (orderId) REFERENCES orders(id)
) ENGINE=InnoDB;

ALTER TABLE orders
  ADD COLUMN paymentStatus ENUM('PENDING','PROCESSING','PAID','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN payoutStatus ENUM('PENDING','AVAILABLE','PROCESSING','COMPLETED','FAILED','BLOCKED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN idempotencyKey VARCHAR(128) NULL,
  ADD COLUMN providerReference VARCHAR(255) NULL,
  ADD UNIQUE KEY uq_orders_idempotency (idempotencyKey);

CREATE TABLE IF NOT EXISTS ticket_ownership_history (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ticketId INT NOT NULL,
  fromOwnerId VARCHAR(128),
  toOwnerId VARCHAR(128) NOT NULL,
  orderId VARCHAR(64),
  resaleListingId VARCHAR(64),
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ownership_ticket (ticketId),
  FOREIGN KEY (ticketId) REFERENCES order_tickets(id),
  FOREIGN KEY (fromOwnerId) REFERENCES users(uid) ON DELETE SET NULL,
  FOREIGN KEY (toOwnerId) REFERENCES users(uid)
) ENGINE=InnoDB;

ALTER TABLE order_tickets
  ADD COLUMN currentOwnerId VARCHAR(128) NULL,
  ADD COLUMN status ENUM('VALID','USED','REFUNDED','CANCELLED') NOT NULL DEFAULT 'VALID',
  ADD COLUMN listedForResale TINYINT(1) NOT NULL DEFAULT 0,
  ADD INDEX idx_ticket_owner (currentOwnerId),
  ADD FOREIGN KEY (currentOwnerId) REFERENCES users(uid) ON DELETE SET NULL;

ALTER TABLE resale_listings
  MODIFY status VARCHAR(16) NOT NULL DEFAULT 'available';

UPDATE resale_listings SET status = CASE status
  WHEN 'available' THEN 'ACTIVE'
  WHEN 'sold' THEN 'SOLD'
  WHEN 'cancelled' THEN 'CANCELLED'
  ELSE status
END;

ALTER TABLE resale_listings
  MODIFY status ENUM('DRAFT','ACTIVE','RESERVED','SOLD','CANCELLED','EXPIRED','REMOVED') NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN ticketId INT NULL,
  ADD COLUMN reservedBy VARCHAR(128) NULL,
  ADD COLUMN reservedUntil DATETIME NULL,
  ADD COLUMN soldAt DATETIME NULL,
  ADD INDEX idx_resale_ticket (ticketId),
  ADD FOREIGN KEY (ticketId) REFERENCES order_tickets(id),
  ADD FOREIGN KEY (reservedBy) REFERENCES users(uid) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS seller_balances (
  sellerId VARCHAR(128) NOT NULL PRIMARY KEY,
  pendingBalance DECIMAL(12,2) NOT NULL DEFAULT 0,
  availableBalance DECIMAL(12,2) NOT NULL DEFAULT 0,
  paidOutBalance DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'MWK',
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sellerId) REFERENCES users(uid)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS financial_ledger (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sellerId VARCHAR(128),
  buyerId VARCHAR(128),
  eventId INT,
  ticketId INT,
  orderId VARCHAR(64),
  resaleListingId VARCHAR(64),
  paymentId VARCHAR(64),
  payoutId VARCHAR(64),
  transactionType ENUM('PRIMARY_TICKET_SALE','PLATFORM_FEE','SECONDARY_TICKET_SALE','SECONDARY_RESELLER_FEE','REFUND','PAYOUT','PAYOUT_REVERSAL','ADJUSTMENT','CHARGEBACK') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'MWK',
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  providerReference VARCHAR(255),
  description VARCHAR(512),
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ledger_payment_type (paymentId, transactionType),
  INDEX idx_ledger_seller (sellerId),
  INDEX idx_ledger_order (orderId),
  FOREIGN KEY (sellerId) REFERENCES users(uid) ON DELETE SET NULL,
  FOREIGN KEY (buyerId) REFERENCES users(uid) ON DELETE SET NULL,
  FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (ticketId) REFERENCES order_tickets(id) ON DELETE SET NULL,
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (resaleListingId) REFERENCES resale_listings(id) ON DELETE SET NULL,
  FOREIGN KEY (paymentId) REFERENCES payments(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payout_requests (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  sellerId VARCHAR(128) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status ENUM('REQUESTED','ACCOUNTANT_REVIEW','APPROVED','PROCESSING','COMPLETED','FAILED','CANCELLED') NOT NULL DEFAULT 'REQUESTED',
  providerReference VARCHAR(255),
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payout_seller (sellerId),
  FOREIGN KEY (sellerId) REFERENCES users(uid)
) ENGINE=InnoDB;