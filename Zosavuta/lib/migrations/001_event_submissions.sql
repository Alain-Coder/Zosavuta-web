-- Migration: event_submissions table + ticket workflow
USE zosavuta;

CREATE TABLE IF NOT EXISTS event_submissions (
  id               INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title            VARCHAR(255)  NOT NULL,
  description      TEXT,
  fullDescription  TEXT,
  category         VARCHAR(32)   NOT NULL DEFAULT 'music',
  date             DATE          NOT NULL,
  time             TIME          NOT NULL,
  location         VARCHAR(255)  NOT NULL,
  venue            VARCHAR(255)  NOT NULL,
  image            VARCHAR(512),
  price            DECIMAL(10,2) DEFAULT NULL,
  ticketsTotal     INT           DEFAULT NULL,
  organizerId      VARCHAR(128)  NOT NULL,
  busTransport     TINYINT(1)   NOT NULL DEFAULT 0,
  seatingChart     TINYINT(1)   NOT NULL DEFAULT 0,
  status           ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  ticketDetailsSubmitted TINYINT(1) NOT NULL DEFAULT 0,
  rejectionReason  TEXT,
  reviewedBy       VARCHAR(128),
  reviewedAt       DATETIME,
  eventId          INT,
  createdAt        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_submissions_organizer (organizerId),
  INDEX idx_submissions_status (status),
  FOREIGN KEY (organizerId) REFERENCES users(uid) ON DELETE CASCADE,
  FOREIGN KEY (reviewedBy) REFERENCES users(uid) ON DELETE SET NULL,
  FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE event_submissions ADD COLUMN ticketDetailsSubmitted TINYINT(1) NOT NULL DEFAULT 0 AFTER status;

ALTER TABLE event_submissions MODIFY COLUMN price DECIMAL(10,2) DEFAULT NULL;

ALTER TABLE event_submissions MODIFY COLUMN ticketsTotal INT DEFAULT NULL;
