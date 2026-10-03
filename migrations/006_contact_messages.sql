-- Migration 006: Ensure contact_messages table exists with appropriate indices
CREATE TABLE IF NOT EXISTS contact_messages (
  id        INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(255) NOT NULL,
  email     VARCHAR(255) NOT NULL,
  subject   VARCHAR(255) NOT NULL,
  message   TEXT         NOT NULL,
  status    ENUM('unread','read','resolved') NOT NULL DEFAULT 'unread',
  createdAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_contact_messages_email (email),
  INDEX idx_contact_messages_status (status)
) ENGINE=InnoDB;
