-- Migration 008: Newsletter Subscriptions Table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id             INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email          VARCHAR(255) NOT NULL UNIQUE,
  status         ENUM('active','unsubscribed') NOT NULL DEFAULT 'active',
  source         VARCHAR(64)  NOT NULL DEFAULT 'footer',
  subscribedAt   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unsubscribedAt DATETIME,
  INDEX idx_newsletter_email  (email),
  INDEX idx_newsletter_status (status)
) ENGINE=InnoDB;
