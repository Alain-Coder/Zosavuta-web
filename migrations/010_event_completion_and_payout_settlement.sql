-- Migration 010: Event completion status and verified payout details for settlement
USE zosavuta;

-- Ensure events status supports 'completed'
ALTER TABLE events
  MODIFY COLUMN status ENUM('active','draft','sold_out','cancelled','expired','completed') NOT NULL DEFAULT 'active';

-- Add payout settlement details to payout_requests
ALTER TABLE payout_requests
  ADD COLUMN IF NOT EXISTS payoutDetails JSON NULL,
  ADD COLUMN IF NOT EXISTS feeAmount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS netAmount DECIMAL(12,2) NOT NULL DEFAULT 0.00;
