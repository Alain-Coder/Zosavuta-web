import { auth } from '@/lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

async function getBearerToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

export async function getAuthHeaders(
  extra: Record<string, string> = {}
): Promise<HeadersInit> {
  const token = await getBearerToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

export async function getAuthUploadHeaders(): Promise<HeadersInit> {
  const token = await getBearerToken();
  return { Authorization: `Bearer ${token}` };
}

export async function reauthenticateWithPassword(password: string): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email || !user.providerData.some((provider) => provider.providerId === 'password')) {
    throw new Error('Your session expired. Sign in again with your account password to continue.');
  }

  if (!password) throw new Error('Enter your password to continue.');

  try {
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    await user.getIdToken(true);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
      throw new Error('That password was not accepted. Please try again.');
    }
    throw error;
  }
}

export async function openAuthenticatedDocument(url: string): Promise<void> {
  const documentWindow = window.open('', '_blank');
  if (!documentWindow) throw new Error('Allow pop-ups to view this document.');
  documentWindow.opener = null;
  documentWindow.document.title = 'Loading document';

  try {
    const response = await fetch(url, { headers: await getAuthUploadHeaders() });
    if (!response.ok) throw new Error('Unable to retrieve this document. Sign in again and retry.');
    const objectUrl = URL.createObjectURL(await response.blob());
    documentWindow.location.href = objectUrl;
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (error) {
    documentWindow.close();
    throw error;
  }
}
