## Email Verification Implementation

Implement email verification for all users (`ATTENDEE`, `ORGANIZER`, and `ATTENDEE_ORGANIZER`) during signup.

1. **Signup:** After registration, create the account with an unverified email status and send a verification link to the user's email address.
2. **Verification Link:** Generate a secure, single-use verification token that expires after 30 minutes. Once verified, update the user's email verification status.
3. **Login:** Do not require email verification every time a user logs in. Simply check whether their email is already verified. If not, restrict access and redirect them to the email verification page.
4. **Resend Verification:** Allow users to request another verification email, with rate limiting to prevent abuse.
5. **User Notification:** Inform users to check their inbox and spam/junk folder if they haven't received the verification email.
6. **Security:** Store verification tokens securely, prevent token reuse, and ensure expired tokens cannot be used. Require an explicit confirmation action before consuming a token to protect against automated email link scanners.
7. **Google Login:** If Google authentication is supported, accept the email as verified when Google provides a trusted `email_verified` claim.
8. **Sensitive Actions:** Require additional authentication for sensitive operations such as changing passwords, updating payout bank details, or requesting payouts.

**Important:** Email verification and organizer KYC verification must remain separate processes. A verified email does not mean an organizer is KYC-approved.

Use the existing authentication system and database structure. Avoid duplicating functionality that is already implemented.