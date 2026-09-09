-- Migration 004: Organizer event management and ticket type pricing
USE zosavuta;


ALTER TABLE events ADD COLUMN ticketTypes JSON;
ALTER TABLE event_submissions ADD COLUMN ticketTypes JSON;