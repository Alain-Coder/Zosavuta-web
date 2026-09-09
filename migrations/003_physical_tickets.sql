-- Migration 003: Physical bearer tickets, allocations, selling points and scans
USE zosavuta;

CREATE TABLE IF NOT EXISTS selling_points (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  eventId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  contactName VARCHAR(255),
  contactPhone VARCHAR(64),
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_selling_points_event (eventId),
  FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS physical_tickets (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  eventId INT NOT NULL,
  ticketNumber VARCHAR(128) NOT NULL UNIQUE,
  secureToken CHAR(64) NOT NULL UNIQUE,
  ticketType VARCHAR(128) NOT NULL DEFAULT 'Regular',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('AVAILABLE','ALLOCATED','SOLD','USED','CANCELLED','REFUNDED') NOT NULL DEFAULT 'ALLOCATED',
  sellingPointId VARCHAR(64),
  allocatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  soldAt DATETIME,
  usedAt DATETIME,
  cancelledAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_physical_tickets_event_status (eventId, status),
  INDEX idx_physical_tickets_selling_point (sellingPointId),
  FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (sellingPointId) REFERENCES selling_points(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ticket_allocations (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  eventId INT NOT NULL,
  ticketId VARCHAR(64) NOT NULL,
  sellingPointId VARCHAR(64),
  allocatedTo VARCHAR(255),
  status ENUM('ALLOCATED','RETURNED') NOT NULL DEFAULT 'ALLOCATED',
  allocatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  returnedAt DATETIME,
  INDEX idx_ticket_allocations_event (eventId),
  INDEX idx_ticket_allocations_ticket (ticketId),
  FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (ticketId) REFERENCES physical_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (sellingPointId) REFERENCES selling_points(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ticket_scans (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ticketId VARCHAR(64),
  eventId INT NOT NULL,
  scannedBy VARCHAR(128) NOT NULL,
  deviceInfo VARCHAR(512),
  result ENUM('VALID_ENTRY','ALREADY_USED','NOT_SOLD','INVALID','WRONG_EVENT','CANCELLED','REFUNDED','EXPIRED') NOT NULL,
  scannedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ticket_scans_event (eventId, scannedAt),
  INDEX idx_ticket_scans_ticket (ticketId),
  FOREIGN KEY (ticketId) REFERENCES physical_tickets(id) ON DELETE SET NULL,
  FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (scannedBy) REFERENCES users(uid) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ticket_audit_logs (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actorId VARCHAR(128) NOT NULL,
  actorRole VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  eventId INT NOT NULL,
  ticketId VARCHAR(64),
  metadata JSON,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ticket_audit_event (eventId, createdAt),
  INDEX idx_ticket_audit_ticket (ticketId),
  FOREIGN KEY (actorId) REFERENCES users(uid) ON DELETE RESTRICT,
  FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (ticketId) REFERENCES physical_tickets(id) ON DELETE SET NULL
) ENGINE=InnoDB;