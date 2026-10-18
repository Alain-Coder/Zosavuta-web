-- Migration 015: allow administrators to temporarily suspend active events.
USE zosavuta;

ALTER TABLE events
  MODIFY COLUMN status ENUM('active','suspended','draft','sold_out','cancelled','expired','completed') NOT NULL DEFAULT 'active';
