import { auth } from '@/lib/firebase';

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
