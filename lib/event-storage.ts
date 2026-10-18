import path from 'path';

export function getEventUploadDirectory(): string {
  return process.env.EVENT_UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads', 'events');
}

export function getEventCoverUrl(image: string | null | undefined): string | null | undefined {
  if (!image) return image;

  const match = /^(?:https?:\/\/[^/]+)?\/?uploads\/events\/([A-Za-z0-9_-]+-\d+\.(?:jpg|png|webp))$/i.exec(image);
  return match ? `/api/uploads/events/${encodeURIComponent(match[1])}` : image;
}