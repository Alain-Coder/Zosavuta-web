-- Migration 014: make events.id a random 24-character hex key while preserving
-- the current numeric event IDs as legacyId for internal eventId references.
--
-- Run once after migration 012 on the legacy schema. The migration below is
-- tailored to the known FK names and delete rules in that schema. Back up the
-- database before running this DDL; MariaDB commits ALTER TABLE statements
-- independently.

-- Keep existing public IDs where present and generate IDs for missing ones.
-- IF NOT EXISTS / NULL checks allow recovery if execution stopped during this
-- initial backfill; the constraint and key changes below must run only once.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS legacyId INT NULL AFTER id;

UPDATE events
SET legacyId = id
WHERE legacyId IS NULL;

UPDATE events
SET publicId = LOWER(SUBSTRING(MD5(CONCAT(UUID(), RAND(), NOW(6))), 1, 24))
WHERE publicId IS NULL
   OR publicId NOT REGEXP '^[a-fA-F0-9]{24}$';

-- Remove the foreign keys that currently target the numeric events primary key.
ALTER TABLE event_submissions DROP FOREIGN KEY event_submissions_ibfk_3;
ALTER TABLE financial_ledger DROP FOREIGN KEY financial_ledger_ibfk_3;
ALTER TABLE orders DROP FOREIGN KEY orders_ibfk_2;
ALTER TABLE physical_tickets DROP FOREIGN KEY physical_tickets_ibfk_1;
ALTER TABLE resale_listings DROP FOREIGN KEY resale_listings_ibfk_2;
ALTER TABLE selling_points DROP FOREIGN KEY selling_points_ibfk_1;
ALTER TABLE ticket_allocations DROP FOREIGN KEY ticket_allocations_ibfk_1;
ALTER TABLE ticket_audit_logs DROP FOREIGN KEY ticket_audit_logs_ibfk_2;
ALTER TABLE ticket_scans DROP FOREIGN KEY ticket_scans_ibfk_2;

-- Replace the numeric key values with the random IDs, then promote legacyId to
-- the auto-incrementing unique key used by all internal numeric event relations.
ALTER TABLE events
  MODIFY id CHAR(24) NOT NULL;

UPDATE events
SET id = LOWER(publicId);

ALTER TABLE events
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY uq_events_legacyId (legacyId);

ALTER TABLE events
  MODIFY legacyId INT NOT NULL AUTO_INCREMENT,
  DROP COLUMN publicId;

-- Keep internal eventId values numeric and point their constraints at legacyId.
ALTER TABLE event_submissions
  ADD CONSTRAINT fk_event_submissions_event_legacyId
  FOREIGN KEY (eventId) REFERENCES events(legacyId) ON DELETE SET NULL;
ALTER TABLE financial_ledger
  ADD CONSTRAINT fk_financial_ledger_event_legacyId
  FOREIGN KEY (eventId) REFERENCES events(legacyId) ON DELETE SET NULL;
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_event_legacyId
  FOREIGN KEY (eventId) REFERENCES events(legacyId) ON DELETE CASCADE;
ALTER TABLE physical_tickets
  ADD CONSTRAINT fk_physical_tickets_event_legacyId
  FOREIGN KEY (eventId) REFERENCES events(legacyId) ON DELETE CASCADE;
ALTER TABLE resale_listings
  ADD CONSTRAINT fk_resale_listings_event_legacyId
  FOREIGN KEY (eventId) REFERENCES events(legacyId) ON DELETE CASCADE;
ALTER TABLE selling_points
  ADD CONSTRAINT fk_selling_points_event_legacyId
  FOREIGN KEY (eventId) REFERENCES events(legacyId) ON DELETE CASCADE;
ALTER TABLE ticket_allocations
  ADD CONSTRAINT fk_ticket_allocations_event_legacyId
  FOREIGN KEY (eventId) REFERENCES events(legacyId) ON DELETE CASCADE;
ALTER TABLE ticket_audit_logs
  ADD CONSTRAINT fk_ticket_audit_logs_event_legacyId
  FOREIGN KEY (eventId) REFERENCES events(legacyId) ON DELETE CASCADE;
ALTER TABLE ticket_scans
  ADD CONSTRAINT fk_ticket_scans_event_legacyId
  FOREIGN KEY (eventId) REFERENCES events(legacyId) ON DELETE CASCADE;
