-- Migration 007: Add 'expired' status to events table
ALTER TABLE events
  MODIFY COLUMN status ENUM('active','draft','sold_out','cancelled','expired') NOT NULL DEFAULT 'active';
