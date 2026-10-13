-- Migration 012: superseded.
-- The project now uses `events.id` as the public random-hex key and keeps the
-- old numeric ID as `events.legacyId` for all internal foreign-key references.
-- Do not add `publicId` / `eventPublicId` columns; use the conversion migration
-- `014_event_hex_id_conversion.sql` to migrate an older database safely.

-- This file intentionally performs no schema changes so a stale migration run
-- does not reintroduce the deprecated public-id model.

