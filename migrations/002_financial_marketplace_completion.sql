-- Migration 002: Financial Marketplace Completion
-- Creates tables for fee schedules, audit logs, and missing indexes.

USE zosavuta;

-- Fee Schedules
CREATE TABLE IF NOT EXISTS financial_fee_schedules (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  buyerFeePercent DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  buyerFeeFixed DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  organizerFeePercent DECIMAL(5,2) NOT NULL DEFAULT 7.00,
  resaleFeePercent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  payoutFeeFixed DECIMAL(10,2) NOT NULL DEFAULT 500.00,
  payoutFeePercent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  refundFeeFixed DECIMAL(10,2) NOT NULL DEFAULT 200.00,
  isDefault TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Insert default fee schedule if not exists
INSERT IGNORE INTO financial_fee_schedules (id, name, buyerFeePercent, buyerFeeFixed, organizerFeePercent, resaleFeePercent, payoutFeeFixed, payoutFeePercent, refundFeeFixed, isDefault)
VALUES (1, 'STANDARD_DEFAULT', 5.00, 100.00, 7.00, 10.00, 500.00, 0.00, 200.00, 1);

-- Financial Audit Logs
CREATE TABLE IF NOT EXISTS financial_audit_logs (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actorId VARCHAR(128) NOT NULL,
  actorRole VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  entityType VARCHAR(64) NOT NULL,
  entityId VARCHAR(128) NOT NULL,
  oldValues JSON,
  newValues JSON,
  ipAddress VARCHAR(64),
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fin_audit_actor (actorId),
  INDEX idx_fin_audit_entity (entityType, entityId)
) ENGINE=InnoDB;
