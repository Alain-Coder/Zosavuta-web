'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders, getAuthUploadHeaders } from '@/lib/auth-client';
import {
  REGISTRATION_TYPES,
  MALAWI_DISTRICTS,
  type OrganizerVerificationStatus,
  type BusinessType,
  type ShareholderMember,
  type PayoutDetails,
} from '@/lib/organizer-verification-types';
import { toast } from 'sonner';
import {
  ShieldCheckIcon,
  ShieldAlertIcon,
  ClockIcon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertTriangleIcon,
  UploadIcon,
  FileTextIcon,
  Building2Icon,
  UserIcon,
  PlusIcon,
  Trash2Icon,
  Loader2Icon,
  InfoIcon,
  EyeIcon,
  HistoryIcon,
} from 'lucide-react';

export default function OrganizerVerificationPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);

  // Status & History from backend
  const [status, setStatus] = useState<OrganizerVerificationStatus>('NOT_STARTED');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Form state
  const [businessType, setBusinessType] = useState<BusinessType>('unregistered');

  // Individual Organizer Fields
  const [legalName, setLegalName] = useState('');
  const [dob, setDob] = useState('');
  const [idDocumentUrl, setIdDocumentUrl] = useState('');
  const [idDocumentType, setIdDocumentType] = useState('National ID');
  const [phone, setPhone] = useState('');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [individualPayoutMethod, setIndividualPayoutMethod] = useState<'bank' | 'mobile_money'>('mobile_money');
  const [indBankName, setIndBankName] = useState('');
  const [indAccountNumber, setIndAccountNumber] = useState('');
  const [indAccountName, setIndAccountName] = useState('');
  const [indMobileProvider, setIndMobileProvider] = useState<'Airtel Money' | 'TNM Mpamba'>('Airtel Money');
  const [indMobileNumber, setIndMobileNumber] = useState('');

  // Registered Business Fields
  const [businessName, setBusinessName] = useState('');
  const [registrationType, setRegistrationType] = useState<string>(REGISTRATION_TYPES[5]); // private company
  const [certificateUrl, setCertificateUrl] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [stateDistrict, setStateDistrict] = useState<string>(MALAWI_DISTRICTS[11]); // Lilongwe District
  const [postalCode, setPostalCode] = useState('');
  const [applicantOwnership, setApplicantOwnership] = useState<number>(100);
  const [shareholders, setShareholders] = useState<ShareholderMember[]>([]);
  const [bizPayoutMethod, setBizPayoutMethod] = useState<'bank' | 'mobile_money'>('bank');
  const [bizBankName, setBizBankName] = useState('');
  const [bizAccountNumber, setBizAccountNumber] = useState('');
  const [bizAccountName, setBizAccountName] = useState('');
  const [bizMobileProvider, setBizMobileProvider] = useState<'Airtel Money' | 'TNM Mpamba'>('Airtel Money');
  const [bizMobileNumber, setBizMobileNumber] = useState('');

  const docInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);

  // Fetch current verification
  useEffect(() => {
    async function loadVerification() {
      if (!user) return;
      try {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/organizer/verification', { headers });
        if (!res.ok) throw new Error('Failed to load verification');
        const data = await res.json();
        const v = data.verification;

        if (v) {
          setStatus(v.status || 'NOT_STARTED');
          setBusinessType(v.businessType || 'unregistered');
          setRejectionReason(v.rejectionReason || null);
          setAdminNotes(v.adminNotes || null);

          // Individual
          setLegalName(v.legalName || user.displayName || '');
          setDob(v.dob || '');
          setIdDocumentUrl(v.idDocumentUrl || '');
          setIdDocumentType(v.idDocumentType || 'National ID');
          setPhone(v.phone || '');
          setResidentialAddress(v.residentialAddress || '');
          if (v.individualPayoutDetails) {
            setIndividualPayoutMethod(v.individualPayoutDetails.method || 'mobile_money');
            setIndBankName(v.individualPayoutDetails.bankName || '');
            setIndAccountNumber(v.individualPayoutDetails.accountNumber || '');
            setIndAccountName(v.individualPayoutDetails.accountName || '');
            setIndMobileProvider(v.individualPayoutDetails.mobileProvider || 'Airtel Money');
            setIndMobileNumber(v.individualPayoutDetails.mobileNumber || '');
          }

          // Registered
          setBusinessName(v.businessName || '');
          if (v.registrationType) setRegistrationType(v.registrationType);
          setCertificateUrl(v.certificateUrl || '');
          setBusinessAddress(v.businessAddress || '');
          if (v.stateDistrict) setStateDistrict(v.stateDistrict);
          setPostalCode(v.postalCode || '');
          setApplicantOwnership(v.applicantOwnershipPercentage !== null && v.applicantOwnershipPercentage !== undefined ? Number(v.applicantOwnershipPercentage) : 100);
          setShareholders(v.shareholders || []);
          if (v.businessPayoutDetails) {
            setBizPayoutMethod(v.businessPayoutDetails.method || 'bank');
            setBizBankName(v.businessPayoutDetails.bankName || '');
            setBizAccountNumber(v.businessPayoutDetails.accountNumber || '');
            setBizAccountName(v.businessPayoutDetails.accountName || '');
            setBizMobileProvider(v.businessPayoutDetails.mobileProvider || 'Airtel Money');
            setBizMobileNumber(v.businessPayoutDetails.mobileNumber || '');
          }
        }
        setHistory(data.history || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (user) void loadVerification();
  }, [user]);

  // Ownership calculation
  const totalShareholdersOwnership = useMemo(() => {
    return shareholders.reduce((sum, s) => sum + (Number(s.ownershipPercentage) || 0), 0);
  }, [shareholders]);

  const totalCalculatedOwnership = useMemo(() => {
    return (Number(applicantOwnership) || 0) + totalShareholdersOwnership;
  }, [applicantOwnership, totalShareholdersOwnership]);

  // Document upload handler
  const handleFileUpload = async (file: File, type: 'doc' | 'cert') => {
    const isDoc = type === 'doc';
    if (isDoc) setUploadingDoc(true);
    else setUploadingCert(true);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const headers = await getAuthUploadHeaders();
      const res = await fetch('/api/upload/kyc-document', {
        method: 'POST',
        headers,
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      if (isDoc) {
        setIdDocumentUrl(data.url);
        toast.success('Identity document uploaded successfully');
      } else {
        setCertificateUrl(data.url);
        toast.success('Registration certificate uploaded successfully');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      if (isDoc) setUploadingDoc(false);
      else setUploadingCert(false);
    }
  };

  // Shareholder helpers
  const addShareholder = () => {
    setShareholders([
      ...shareholders,
      { fullName: '', email: '', phone: '', ownershipPercentage: 0 },
    ]);
  };

  const updateShareholder = (index: number, field: keyof ShareholderMember, val: any) => {
    setShareholders((prev) =>
      prev.map((sh, i) => (i === index ? { ...sh, [field]: val } : sh))
    );
  };

  const removeShareholder = (index: number) => {
    setShareholders((prev) => prev.filter((_, i) => i !== index));
  };

  // Form submission
  const handleSubmit = async (action: 'submit' | 'save_draft') => {
    if (businessType === 'registered' && action === 'submit') {
      if (Math.abs(totalCalculatedOwnership - 100) > 0.01) {
        toast.error(`Total ownership percentage must equal exactly 100%. (Current: ${totalCalculatedOwnership}%)`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const individualPayoutDetails: PayoutDetails = {
        method: 'bank',
        bankName: indBankName,
        accountNumber: indAccountNumber,
        accountName: indAccountName,
      };

      const businessPayoutDetails: PayoutDetails = {
        method: 'bank',
        bankName: bizBankName,
        accountNumber: bizAccountNumber,
        accountName: bizAccountName,
      };

      const payload = {
        action,
        businessType,
        ...(businessType === 'unregistered'
          ? {
            legalName,
            dob,
            idDocumentUrl,
            idDocumentType,
            phone,
            residentialAddress,
            individualPayoutDetails,
          }
          : {
            businessName,
            registrationType,
            certificateUrl,
            businessAddress,
            stateDistrict,
            postalCode,
            applicantOwnershipPercentage: applicantOwnership,
            shareholders,
            businessPayoutDetails,
          }),
      };

      const headers = await getAuthHeaders();
      const res = await fetch('/api/organizer/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      toast.success(data.message || 'Verification submitted!');
      if (data.verification) {
        setStatus(data.verification.status);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2Icon className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading verification status…</p>
        </div>
      </div>
    );
  }

  const isApproved = status === 'APPROVED';
  const isPending = status === 'SUBMITTED' || status === 'UNDER_REVIEW';
  const isRejected = status === 'REJECTED';
  const isSuspended = status === 'SUSPENDED';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheckIcon className="w-5 h-5 text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Identity & Compliance</p>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Organizer KYC Verification</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Verify your identity or registered organization to publish events, sell tickets, and receive payouts.
          </p>
        </div>

        {/* Current status badge */}
        <div>
          {isApproved && (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs px-3 py-1.5 font-bold flex items-center gap-1.5 rounded-full">
              <CheckCircle2Icon className="w-4 h-4 text-emerald-500" />
              Verified Organizer
            </Badge>
          )}
          {isPending && (
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs px-3 py-1.5 font-bold flex items-center gap-1.5 rounded-full">
              <ClockIcon className="w-4 h-4 text-amber-500 animate-pulse" />
              {status === 'UNDER_REVIEW' ? 'Under Review' : 'Submitted for Verification'}
            </Badge>
          )}
          {isRejected && (
            <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-xs px-3 py-1.5 font-bold flex items-center gap-1.5 rounded-full">
              <XCircleIcon className="w-4 h-4 text-red-500" />
              Verification Rejected
            </Badge>
          )}
          {isSuspended && (
            <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs px-3 py-1.5 font-bold flex items-center gap-1.5 rounded-full">
              <AlertTriangleIcon className="w-4 h-4 text-purple-500" />
              Verification Suspended
            </Badge>
          )}
          {status === 'NOT_STARTED' && (
            <Badge className="bg-muted text-muted-foreground border border-border text-xs px-3 py-1.5 font-bold flex items-center gap-1.5 rounded-full">
              <ShieldAlertIcon className="w-4 h-4" />
              Not Started
            </Badge>
          )}
        </div>
      </div>

      {/* Alert Banners */}
      {isApproved && (
        <Card className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 flex gap-3">
          <CheckCircle2Icon className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
              Account Verified and Approved
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Your organizer verification is in good standing. You are authorized to publish events, sell tickets, generate physical selling-point tickets, and receive settlement payouts.
            </p>
          </div>
        </Card>
      )}

      {isPending && (
        <Card className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 flex gap-3">
          <ClockIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-300">
              Verification Documents Under Review
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Our compliance team is currently reviewing your submitted KYC details. This usually takes 1-2 business days. You can update your submission below if needed.
            </p>
            {adminNotes && (
              <p className="text-xs bg-amber-100 dark:bg-amber-900/40 p-2 rounded-lg text-amber-900 dark:text-amber-200 mt-2 font-medium">
                Note from reviewer: {adminNotes}
              </p>
            )}
          </div>
        </Card>
      )}

      {isRejected && (
        <Card className="p-4 bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800 flex gap-3">
          <XCircleIcon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-red-900 dark:text-red-300">
              Verification Needs Attention
            </p>
            <p className="text-xs text-red-700 dark:text-red-400">
              Reason: <span className="font-semibold">{rejectionReason || 'Uploaded documents were unclear or invalid.'}</span>
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-1">
              Please correct the fields below and re-submit your verification documents.
            </p>
          </div>
        </Card>
      )}

      {/* Main Verification Form */}
      <Card className="p-6 space-y-6">
        {/* Business Type Selector */}
        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
            Verification Entity Type
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isApproved}
              onClick={() => setBusinessType('unregistered')}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${businessType === 'unregistered'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border hover:bg-muted/40'
                }`}
            >
              <div className={`p-2.5 rounded-xl ${businessType === 'unregistered' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Individual Organizer</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Unregistered individual operating independently. Requires National ID or Passport.
                </p>
              </div>
            </button>

            <button
              type="button"
              disabled={isApproved}
              onClick={() => setBusinessType('registered')}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${businessType === 'registered'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border hover:bg-muted/40'
                }`}
            >
              <div className={`p-2.5 rounded-xl ${businessType === 'registered' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <Building2Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Registered Business / Organization</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Registered company, LLC, partnership, or non-profit with registration certificate.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* ─────────────────── INDIVIDUAL ORGANIZER FIELDS ─────────────────── */}
        {businessType === 'unregistered' && (
          <div className="space-y-5 pt-4 border-t border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">Full Legal Name *</Label>
                <Input
                  className="mt-1.5"
                  placeholder="e.g. Kondwani Chirwa"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  disabled={isApproved}
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">Date of Birth *</Label>
                <Input
                  type="date"
                  className="mt-1.5"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  disabled={isApproved}
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">Phone Number *</Label>
                <Input
                  className="mt-1.5"
                  placeholder="e.g. +265 999 123 456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isApproved}
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">ID Document Type</Label>
                <select
                  className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                  value={idDocumentType}
                  onChange={(e) => setIdDocumentType(e.target.value)}
                  disabled={isApproved}
                >
                  <option value="National ID">Malawi National ID</option>
                  <option value="Passport">International Passport</option>
                  <option value="Driver License">Driver's License</option>
                </select>
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider block mb-1">
                National ID or Passport Upload *
              </Label>
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg flex items-start gap-2 mb-2">
                <InfoIcon className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  <span className="font-bold">Notice:</span> Ensure the document is clear on the edges, all 4 corners are visible, text is fully legible, and there is no glare. Accepts JPG, PNG, or PDF up to 10 MB.
                </p>
              </div>

              <input
                ref={docInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file, 'doc');
                }}
              />

              {idDocumentUrl ? (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <FileTextIcon className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Document Uploaded</p>
                      <a
                        href={idDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline flex items-center gap-1 mt-0.5"
                      >
                        <EyeIcon className="w-3 h-3" /> View / Download uploaded document
                      </a>
                    </div>
                  </div>
                  {!isApproved && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => docInputRef.current?.click()}
                      disabled={uploadingDoc}
                    >
                      {uploadingDoc ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : 'Replace'}
                    </Button>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => !isApproved && docInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  {uploadingDoc ? (
                    <Loader2Icon className="w-6 h-6 animate-spin text-primary mx-auto" />
                  ) : (
                    <>
                      <UploadIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-semibold">Click to upload National ID or Passport</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG or PDF (max 10 MB)</p>
                    </>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs font-bold uppercase tracking-wider">Residential / Contact Information *</Label>
              <Textarea
                className="mt-1.5"
                rows={2}
                placeholder="Residential street address, city/area, Malawi"
                value={residentialAddress}
                onChange={(e) => setResidentialAddress(e.target.value)}
                disabled={isApproved}
              />
            </div>

            {/* Individual Payout Details */}
            <div className="pt-2">
              <div className="mb-2">
                <Label className="text-xs font-bold uppercase tracking-wider block">
                  Bank Payout Details *
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Per Zosavuta policy, seller payouts are settled exclusively via Bank Transfer into your verified bank account.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-border bg-muted/20">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider">Bank Name *</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="e.g. National Bank of Malawi"
                    value={indBankName}
                    onChange={(e) => setIndBankName(e.target.value)}
                    disabled={isApproved}
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider">Account Number *</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="e.g. 1002345678"
                    value={indAccountNumber}
                    onChange={(e) => setIndAccountNumber(e.target.value)}
                    disabled={isApproved}
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider">Account Holder Name *</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="e.g. Kondwani Chirwa"
                    value={indAccountName}
                    onChange={(e) => setIndAccountName(e.target.value)}
                    disabled={isApproved}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ────────────── REGISTERED BUSINESS / ORGANIZATION FIELDS ────────────── */}
        {businessType === 'registered' && (
          <div className="space-y-5 pt-4 border-t border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">Registered Business / Organization Name *</Label>
                <Input
                  className="mt-1.5"
                  placeholder="e.g. Lake of Stars Events Ltd"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  disabled={isApproved}
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">Registration Type *</Label>
                <select
                  className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium capitalize"
                  value={registrationType}
                  onChange={(e) => setRegistrationType(e.target.value)}
                  disabled={isApproved}
                >
                  {REGISTRATION_TYPES.map((type) => (
                    <option key={type} value={type} className="capitalize">
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">District / Region *</Label>
                <select
                  className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                  value={stateDistrict}
                  onChange={(e) => setStateDistrict(e.target.value)}
                  disabled={isApproved}
                >
                  {MALAWI_DISTRICTS.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">Postal Code *</Label>
                <Input
                  className="mt-1.5"
                  placeholder="e.g. 265"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  disabled={isApproved}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold uppercase tracking-wider">Business Address *</Label>
              <Textarea
                className="mt-1.5"
                rows={2}
                placeholder="Physical office / registered corporate address"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                disabled={isApproved}
              />
            </div>

            {/* Certificate Upload */}
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider block mb-1">
                Business Registration Certificate *
              </Label>
              <input
                ref={certInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file, 'cert');
                }}
              />

              {certificateUrl ? (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <FileTextIcon className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Certificate Uploaded</p>
                      <a
                        href={certificateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline flex items-center gap-1 mt-0.5"
                      >
                        <EyeIcon className="w-3 h-3" /> View / Download registration certificate
                      </a>
                    </div>
                  </div>
                  {!isApproved && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => certInputRef.current?.click()}
                      disabled={uploadingCert}
                    >
                      {uploadingCert ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : 'Replace'}
                    </Button>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => !isApproved && certInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  {uploadingCert ? (
                    <Loader2Icon className="w-6 h-6 animate-spin text-primary mx-auto" />
                  ) : (
                    <>
                      <UploadIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-semibold">Click to upload Business Registration Certificate</p>
                      <p className="text-xs text-muted-foreground mt-1">Official certificate (JPG, PNG or PDF up to 10 MB)</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Ownership & Shareholders Section */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider block">
                    Ownership Structure (Must equal 100%) *
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your percentage ownership plus all shareholders must total exactly 100%.
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${Math.abs(totalCalculatedOwnership - 100) < 0.01
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-600 border-red-500/20'
                  }`}>
                  Total: {totalCalculatedOwnership}% / 100%
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-muted/20">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider">Your Ownership % *</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="mt-1.5"
                    value={applicantOwnership}
                    onChange={(e) => setApplicantOwnership(Number(e.target.value))}
                    disabled={isApproved}
                  />
                </div>
              </div>

              {/* Shareholders List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Additional Shareholders ({shareholders.length})
                  </span>
                  {!isApproved && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addShareholder}
                      className="gap-1.5 text-xs h-8"
                    >
                      <PlusIcon className="w-3.5 h-3.5" /> Add Shareholder Member
                    </Button>
                  )}
                </div>

                {shareholders.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No additional shareholders added. If you are 100% sole owner, set your ownership to 100%.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {shareholders.map((sh, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-border bg-background space-y-3 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-muted-foreground">
                            Shareholder #{idx + 1}
                          </p>
                          {!isApproved && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removeShareholder(idx)}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2Icon className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Full Name *</Label>
                            <Input
                              className="mt-1 h-8 text-xs"
                              placeholder="Full name"
                              value={sh.fullName}
                              onChange={(e) => updateShareholder(idx, 'fullName', e.target.value)}
                              disabled={isApproved}
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Email *</Label>
                            <Input
                              type="email"
                              className="mt-1 h-8 text-xs"
                              placeholder="email@example.com"
                              value={sh.email}
                              onChange={(e) => updateShareholder(idx, 'email', e.target.value)}
                              disabled={isApproved}
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Phone *</Label>
                            <Input
                              className="mt-1 h-8 text-xs"
                              placeholder="+265..."
                              value={sh.phone}
                              onChange={(e) => updateShareholder(idx, 'phone', e.target.value)}
                              disabled={isApproved}
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Ownership % *</Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              className="mt-1 h-8 text-xs"
                              value={sh.ownershipPercentage}
                              onChange={(e) => updateShareholder(idx, 'ownershipPercentage', Number(e.target.value))}
                              disabled={isApproved}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Business Payout Details */}
            {/* Business Payout Details */}
            <div className="pt-2">
              <div className="mb-2">
                <Label className="text-xs font-bold uppercase tracking-wider block">
                  Corporate Bank Payout Details *
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Corporate organizer payouts are settled exclusively via Bank Transfer into your business bank account.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-border bg-muted/20">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider">Bank Name *</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="e.g. Standard Bank Malawi"
                    value={bizBankName}
                    onChange={(e) => setBizBankName(e.target.value)}
                    disabled={isApproved}
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider">Account Number *</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="Your bank account number"
                    value={bizAccountNumber}
                    onChange={(e) => setBizAccountNumber(e.target.value)}
                    disabled={isApproved}
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider">Account Title / Company Name *</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="Registered business name"
                    value={bizAccountName}
                    onChange={(e) => setBizAccountName(e.target.value)}
                    disabled={isApproved}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isApproved && (
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSubmit('save_draft')}
              disabled={submitting}
            >
              Save Draft
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit('submit')}
              disabled={submitting}
              className="gap-2 font-bold"
            >
              {submitting ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <ShieldCheckIcon className="w-4 h-4" />}
              Submit Verification for Review
            </Button>
          </div>
        )}
      </Card>

      {/* Verification History & Timeline */}
      {history.length > 0 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <HistoryIcon className="w-4 h-4" /> Verification Audit History
          </h2>
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="p-3 rounded-lg border border-border/60 bg-muted/20 text-xs space-y-1">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-primary">{item.action}</span>
                  <span className="text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                {item.notes && <p className="text-muted-foreground">{item.notes}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
