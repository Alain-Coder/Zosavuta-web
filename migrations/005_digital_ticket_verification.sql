-- Migration 005: Secure per-ticket verification tokens
USE zosavuta;

ALTER TABLE order_tickets ADD COLUMN verificationToken CHAR(64) UNIQUE;