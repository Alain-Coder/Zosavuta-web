-- Migration 011: Add isFeatured flag to events for admin-controlled featured events
USE zosavuta;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS isFeatured TINYINT(1) NOT NULL DEFAULT 0;

-- Index for faster featured event queries
CREATE INDEX IF NOT EXISTS idx_events_featured ON events (isFeatured, status, date);
