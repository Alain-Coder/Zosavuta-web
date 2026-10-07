import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, canOrganizeEvents } from '@/lib/auth-server';
import { query, execute } from '@/lib/db';
import {
  getVerificationByUserId,
  getVerificationHistory,
  logVerificationHistory,
  REGISTRATION_TYPES,
  MALAWI_DISTRICTS,
  BusinessType,
} from '@/lib/organizer-verification';
import { logFinancialAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!canOrganizeEvents(user)) {
      return NextResponse.json({ error: 'Organizer access is required' }, { status: 403 });
    }

    const verification = await getVerificationByUserId(user.uid);
    const history = verification ? await getVerificationHistory(verification.id) : [];

    return NextResponse.json({
      verification: verification || {
        userId: user.uid,
        businessType: 'unregistered',
        status: 'NOT_STARTED',
      },
      history,
      isApproved: verification?.status === 'APPROVED',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve verification details';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!canOrganizeEvents(user)) {
      return NextResponse.json({ error: 'Organizer access is required' }, { status: 403 });
    }

    const body = await req.json();
    const businessType: BusinessType = body.businessType === 'registered' ? 'registered' : 'unregistered';
    const isDraft = body.action === 'save_draft';

    // Current record
    const existing = await getVerificationByUserId(user.uid);
    if (existing && existing.status === 'APPROVED') {
      return NextResponse.json({ error: 'Your account is already verified and approved.' }, { status: 400 });
    }

    // Validation when submitting
    if (!isDraft) {
      if (businessType === 'unregistered') {
        if (!body.legalName?.trim()) {
          return NextResponse.json({ error: 'Full legal name is required' }, { status: 400 });
        }
        if (!body.dob?.trim()) {
          return NextResponse.json({ error: 'Date of birth is required' }, { status: 400 });
        }
        if (!body.idDocumentUrl?.trim()) {
          return NextResponse.json({ error: 'National ID or Passport document upload is required' }, { status: 400 });
        }
        if (!body.phone?.trim()) {
          return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }
        if (!body.residentialAddress?.trim()) {
          return NextResponse.json({ error: 'Residential / contact address is required' }, { status: 400 });
        }
        if (!body.individualPayoutDetails?.accountNumber || !body.individualPayoutDetails?.bankName) {
          return NextResponse.json({ error: 'Bank Name and Account Number are required for organizer payouts (Bank Transfer Only)' }, { status: 400 });
        }
      } else {
        // Registered Business validation
        if (!body.businessName?.trim()) {
          return NextResponse.json({ error: 'Registered business/organization name is required' }, { status: 400 });
        }
        if (!body.registrationType || !REGISTRATION_TYPES.includes(body.registrationType)) {
          return NextResponse.json({ error: 'Valid registration type is required' }, { status: 400 });
        }
        if (!body.certificateUrl?.trim()) {
          return NextResponse.json({ error: 'Business registration certificate upload is required' }, { status: 400 });
        }
        if (!body.businessAddress?.trim()) {
          return NextResponse.json({ error: 'Business address is required' }, { status: 400 });
        }
        if (!body.stateDistrict || !MALAWI_DISTRICTS.includes(body.stateDistrict)) {
          return NextResponse.json({ error: 'Valid region/district is required' }, { status: 400 });
        }
        if (!body.postalCode?.trim()) {
          return NextResponse.json({ error: 'Postal code is required' }, { status: 400 });
        }

        // Ownership percentage check
        const applicantPct = Number(body.applicantOwnershipPercentage || 0);
        const shareholders = Array.isArray(body.shareholders) ? body.shareholders : [];
        const shareholdersPct = shareholders.reduce((sum: number, sh: any) => sum + Number(sh.ownershipPercentage || 0), 0);
        const totalOwnership = applicantPct + shareholdersPct;

        if (Math.abs(totalOwnership - 100) > 0.01) {
          return NextResponse.json(
            { error: `Total ownership must equal 100%. (Current total: ${totalOwnership}%)` },
            { status: 400 }
          );
        }

        if (!body.businessPayoutDetails?.accountNumber || !body.businessPayoutDetails?.bankName) {
          return NextResponse.json({ error: 'Corporate Bank Name and Account Number are required for organizer payouts (Bank Transfer Only)' }, { status: 400 });
        }
      }
    }

    const newStatus = isDraft ? (existing?.status || 'NOT_STARTED') : 'SUBMITTED';

    const payload = {
      userId: user.uid,
      businessType,
      status: newStatus,
      legalName: body.legalName || null,
      dob: body.dob || null,
      idDocumentUrl: body.idDocumentUrl || null,
      idDocumentType: body.idDocumentType || null,
      phone: body.phone || null,
      residentialAddress: body.residentialAddress || null,
      individualPayoutDetails: body.individualPayoutDetails ? JSON.stringify(body.individualPayoutDetails) : null,
      registrationType: body.registrationType || null,
      businessName: body.businessName || null,
      certificateUrl: body.certificateUrl || null,
      businessAddress: body.businessAddress || null,
      stateDistrict: body.stateDistrict || null,
      postalCode: body.postalCode || null,
      applicantOwnershipPercentage: body.applicantOwnershipPercentage !== undefined ? Number(body.applicantOwnershipPercentage) : 100.0,
      shareholders: body.shareholders ? JSON.stringify(body.shareholders) : JSON.stringify([]),
      businessPayoutDetails: body.businessPayoutDetails ? JSON.stringify(body.businessPayoutDetails) : null,
      submittedAt: !isDraft ? new Date() : (existing?.submittedAt || null),
    };

    if (existing) {
      await execute(
        `UPDATE organizer_verifications
         SET businessType = ?, status = ?, legalName = ?, dob = ?, idDocumentUrl = ?, idDocumentType = ?,
             phone = ?, residentialAddress = ?, individualPayoutDetails = ?, registrationType = ?,
             businessName = ?, certificateUrl = ?, businessAddress = ?, stateDistrict = ?, postalCode = ?,
             applicantOwnershipPercentage = ?, shareholders = ?, businessPayoutDetails = ?,
             submittedAt = COALESCE(?, submittedAt), rejectionReason = NULL
         WHERE userId = ?`,
        [
          payload.businessType,
          payload.status,
          payload.legalName,
          payload.dob,
          payload.idDocumentUrl,
          payload.idDocumentType,
          payload.phone,
          payload.residentialAddress,
          payload.individualPayoutDetails,
          payload.registrationType,
          payload.businessName,
          payload.certificateUrl,
          payload.businessAddress,
          payload.stateDistrict,
          payload.postalCode,
          payload.applicantOwnershipPercentage,
          payload.shareholders,
          payload.businessPayoutDetails,
          payload.submittedAt,
          user.uid,
        ]
      );
    } else {
      await execute(
        `INSERT INTO organizer_verifications
         (userId, businessType, status, legalName, dob, idDocumentUrl, idDocumentType, phone,
          residentialAddress, individualPayoutDetails, registrationType, businessName, certificateUrl,
          businessAddress, stateDistrict, postalCode, applicantOwnershipPercentage, shareholders,
          businessPayoutDetails, submittedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.userId,
          payload.businessType,
          payload.status,
          payload.legalName,
          payload.dob,
          payload.idDocumentUrl,
          payload.idDocumentType,
          payload.phone,
          payload.residentialAddress,
          payload.individualPayoutDetails,
          payload.registrationType,
          payload.businessName,
          payload.certificateUrl,
          payload.businessAddress,
          payload.stateDistrict,
          payload.postalCode,
          payload.applicantOwnershipPercentage,
          payload.shareholders,
          payload.businessPayoutDetails,
          payload.submittedAt,
        ]
      );
    }

    const updated = await getVerificationByUserId(user.uid);

    if (updated && !isDraft) {
      await logVerificationHistory(
        updated.id,
        user.uid,
        'SUBMITTED',
        user.uid,
        user.role,
        `KYC details submitted for verification (${businessType === 'registered' ? 'Registered Business' : 'Individual Organizer'}).`
      );

      await logFinancialAudit({
        actorId: user.uid,
        actorRole: user.role,
        action: 'ORGANIZER_KYC_SUBMITTED',
        entityType: 'ORGANIZER_VERIFICATION',
        entityId: String(updated.id),
        oldValues: existing ? { status: existing.status } : null,
        newValues: { status: 'SUBMITTED', businessType },
      });
    }

    return NextResponse.json({
      success: true,
      message: isDraft ? 'Verification draft saved.' : 'Verification documents submitted for review.',
      verification: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Submission failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
