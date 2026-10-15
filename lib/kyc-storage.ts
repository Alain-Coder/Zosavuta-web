import path from 'path';

export function getKycUploadDirectory(): string {
  return process.env.KYC_UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'kyc');
}

export function getKycDocumentUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/^\/uploads\/kyc\//, '/api/uploads/kyc/');
}