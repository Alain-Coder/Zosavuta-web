-- Migration 009: Organizer KYC Verification
CREATE TABLE IF NOT EXISTS organizer_verifications (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(255) NOT NULL UNIQUE,
  businessType ENUM('unregistered', 'registered') NOT NULL DEFAULT 'unregistered',
  status ENUM('NOT_STARTED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'NOT_STARTED',
  
  -- Individual Organizer Fields
  legalName VARCHAR(255) NULL,
  dob VARCHAR(50) NULL,
  idDocumentUrl VARCHAR(500) NULL,
  idDocumentType VARCHAR(50) NULL,
  phone VARCHAR(50) NULL,
  residentialAddress TEXT NULL,
  individualPayoutDetails JSON NULL,
  
  -- Registered Business Fields
  registrationType VARCHAR(100) NULL,
  businessName VARCHAR(255) NULL,
  certificateUrl VARCHAR(500) NULL,
  businessAddress TEXT NULL,
  stateDistrict VARCHAR(100) NULL,
  postalCode VARCHAR(50) NULL,
  applicantOwnershipPercentage DECIMAL(5,2) DEFAULT 100.00,
  shareholders JSON NULL,
  businessPayoutDetails JSON NULL,
  
  -- Review metadata
  adminNotes TEXT NULL,
  rejectionReason TEXT NULL,
  reviewedBy VARCHAR(255) NULL,
  reviewedAt DATETIME NULL,
  submittedAt DATETIME NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_org_verif_userId (userId),
  INDEX idx_org_verif_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS organizer_verification_history (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  verificationId INT NOT NULL,
  userId VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  actorId VARCHAR(255) NOT NULL,
  actorRole VARCHAR(50) NOT NULL,
  notes TEXT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ovh_verifId (verificationId),
  INDEX idx_ovh_userId (userId)
) ENGINE=InnoDB;
