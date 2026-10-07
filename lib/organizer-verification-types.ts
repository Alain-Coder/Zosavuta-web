export type OrganizerVerificationStatus =
  | 'NOT_STARTED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export type BusinessType = 'unregistered' | 'registered';

export const REGISTRATION_TYPES = [
  'government instrumentality',
  'governmental unit',
  'incorporated non profit',
  'limited liability partnership',
  'multi member llc',
  'private company',
  'private corporation',
  'private partnership',
  'public company',
  'public corporation',
  'public partnership',
  'single member llc',
  'sole proprietorship',
  'tax exempt government instrumentality',
  'unincorporated association',
  'unincorporated non profit',
] as const;

export type RegistrationType = (typeof REGISTRATION_TYPES)[number];

export const MALAWI_DISTRICTS = [
  'Balaka District',
  'Blantyre District',
  'Central Region',
  'Chikwawa District',
  'Chiradzulu District',
  'Chitipa district',
  'Dedza District',
  'Dowa District',
  'Karonga District',
  'Kasungu District',
  'Likoma District',
  'Lilongwe District',
  'Machinga District',
  'Mangochi District',
  'Mchinji District',
  'Mulanje District',
  'Mwanza District',
  'Mzimba District',
  'Nkhata Bay District',
  'Nkhotakota District',
  'Northern Region',
  'Nsanje District',
  'Ntcheu District',
  'Ntchisi District',
  'Phalombe District',
  'Rumphi District',
  'Salima District',
  'Southern Region',
  'Thyolo District',
  'Zomba District',
] as const;

export type MalawiDistrict = (typeof MALAWI_DISTRICTS)[number];

export interface ShareholderMember {
  fullName: string;
  email: string;
  phone: string;
  ownershipPercentage: number;
}

export interface PayoutDetails {
  method: 'bank' | 'mobile_money';
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  mobileProvider?: 'Airtel Money' | 'TNM Mpamba' | 'Other';
  mobileNumber?: string;
}

export interface OrganizerVerification {
  id: number;
  userId: string;
  businessType: BusinessType;
  status: OrganizerVerificationStatus;

  // Individual fields
  legalName?: string | null;
  dob?: string | null;
  idDocumentUrl?: string | null;
  idDocumentType?: string | null;
  phone?: string | null;
  residentialAddress?: string | null;
  individualPayoutDetails?: PayoutDetails | null;

  // Registered business fields
  registrationType?: RegistrationType | string | null;
  businessName?: string | null;
  certificateUrl?: string | null;
  businessAddress?: string | null;
  stateDistrict?: MalawiDistrict | string | null;
  postalCode?: string | null;
  applicantOwnershipPercentage?: number | null;
  shareholders?: ShareholderMember[] | null;
  businessPayoutDetails?: PayoutDetails | null;

  // Review metadata
  adminNotes?: string | null;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  // Joined user metadata (optional)
  userName?: string;
  userEmail?: string;
}

export interface VerificationHistoryItem {
  id: number;
  verificationId: number;
  userId: string;
  action: string;
  actorId: string;
  actorRole: string;
  notes?: string | null;
  createdAt: string;
}
