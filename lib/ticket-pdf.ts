import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface PdfTicket {
  ticketNumber: string;
  token: string;
  ticketType: string;
  price?: number;
}

export interface PdfTicketEvent {
  title: string;
  date: string;
  time: string;
  venue: string;
  location?: string;
  image?: string;
}

function safeFileName(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'zosavuta-tickets';
}

async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to fetch logo: ${res.status}`);

  const blob = await res.blob();
  const isSvg = blob.type.includes('svg') || imageUrl.toLowerCase().endsWith('.svg');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const dataUrl = reader.result as string;

      if (!isSvg) {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 4;
        canvas.width = (img.width || 200) * scale;
        canvas.height = (img.height || 200) * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not get canvas context'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
    reader.addEventListener('error', reject);
    reader.readAsDataURL(blob);
  });
}

export async function downloadTicketPdf(event: PdfTicketEvent, tickets: PdfTicket[]): Promise<void> {
  if (!tickets.length) throw new Error('No tickets available to download');

  const document = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();

  // --- COLORS ---
  const darkBlue = { r: 10, g: 25, b: 65 };     // #0A1941
  const brightGreen = { r: 0, g: 204, b: 136 }; // #00CC88
  const white = { r: 255, g: 255, b: 255 };
  const textGray = { r: 120, g: 120, b: 140 };
  const lightBlue = { r: 150, g: 175, b: 220 }; // Label color on blue

  // --- FETCH LOGO ---
  const LOGO_PATH = '/zosavuta.png';

  let logoDataUrl: string | null = null;
  try {
    logoDataUrl = await getBase64ImageFromUrl(LOGO_PATH);
  } catch (error) {
    console.warn(`[TicketPDF] Could not load logo.`, error);
  }

  // --- TICKET DIMENSIONS ---
  const ticketWidth = 180;
  const ticketHeight = 78; // slightly reduced height
  const left = (pageWidth - ticketWidth) / 2;
  const top = 40;

  const stubWidth = 45;
  const mainWidth = ticketWidth - stubWidth;

  for (const [index, ticket] of tickets.entries()) {
    if (index > 0) document.addPage();

    const qrDataUrl = await QRCode.toDataURL(
      `${window.location.origin}/tickets/verify/${encodeURIComponent(ticket.token)}`,
      { errorCorrectionLevel: 'H', margin: 1, width: 500 }
    );

    // --- DRAW BACKGROUNDS ---

    // Main (DARK BLUE)
    document.setFillColor(darkBlue.r, darkBlue.g, darkBlue.b);
    document.roundedRect(left, top, mainWidth, ticketHeight, 4, 4, 'F');
    document.rect(left + mainWidth - 4, top, 4, ticketHeight, 'F');

    // Stub (BRIGHT GREEN)
    document.setFillColor(brightGreen.r, brightGreen.g, brightGreen.b);
    document.roundedRect(left + mainWidth, top, stubWidth, ticketHeight, 4, 4, 'F');
    document.rect(left + mainWidth, top, 4, ticketHeight, 'F');

    // --- PERFORATION CUTOUTS ---
    const cutoutRadius = 4;
    const cutoutX = left + mainWidth;

    document.setFillColor(255, 255, 255);
    document.circle(cutoutX, top, cutoutRadius, 'F');
    document.circle(cutoutX, top + ticketHeight, cutoutRadius, 'F');

    document.setDrawColor(255, 255, 255);
    document.setLineDashPattern([1, 1], 0);
    document.line(cutoutX, top + 5, cutoutX, top + ticketHeight - 5);
    document.setLineDashPattern([], 0);

    // ============================================
    // --- LEFT BLUE SECTION — 6-GRID LAYOUT ---
    // ============================================

    // --- LOGO (Top-LEFT, next to event title, no white circle) ---
    const logoSize = 14;
    const logoX = left + 12;
    const logoY = top + 12;

    if (logoDataUrl) {
      try {
        document.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize);
      } catch (e) {
        console.warn('[TicketPDF] Failed to add logo.', e);
      }
    }

    // --- EVENT TITLE (to the right of logo, top row) ---
    const titleStartX = left + 12 + (logoDataUrl ? logoSize + 4 : 0);
    document.setTextColor(lightBlue.r, lightBlue.g, lightBlue.b);
    document.setFont('helvetica', 'normal');
    document.setFontSize(7);
    document.text('EVENT', titleStartX, top + 12);

    document.setTextColor(white.r, white.g, white.b);
    document.setFont('helvetica', 'bold');
    document.setFontSize(16);
    const splitTitle = document.splitTextToSize(event.title, mainWidth - (titleStartX - left) - 10);
    document.text(splitTitle, titleStartX, top + 19);

    // ============================================
    // --- 6-GRID FIELDS (2 columns × 3 rows) ---
    // ============================================
    //
    // Row 1: DATE       | TIME
    // Row 2: VENUE      | TYPE
    // Row 3: (spacer)   | PRICE
    //
    // Actually: 3 rows × 2 cols = 6 cells:
    // Row 1: DATE       | TIME
    // Row 2: VENUE      | TYPE
    // Row 3: PRICE      | (empty or extra)
    //
    // But to keep it clean, we'll arrange as:
    // Row 1: DATE       | TIME
    // Row 2: VENUE      | TYPE
    // Row 3: PRICE      | (nothing)
    //
    // Wait — with EVENT as row 1, we have 3 rows of grid = 6 cells total:
    // Actually: EVENT is header, then 5 fields (DATE, TIME, VENUE, TYPE, PRICE).
    // 5 fields in 2 columns = 3 rows (one cell will be empty).

    const colLeft = left + 14;
    const colRight = left + mainWidth / 2 + 5;
    const row1Y = top + 38; // DATE | TIME
    const row2Y = top + 52; // VENUE | TYPE
    const row3Y = top + 65; // PRICE | (empty)

    // --- ROW 1 ---
    // DATE
    document.setTextColor(lightBlue.r, lightBlue.g, lightBlue.b);
    document.setFont('helvetica', 'normal');
    document.setFontSize(7);
    document.text('DATE', colLeft, row1Y);

    document.setTextColor(white.r, white.g, white.b);
    document.setFont('helvetica', 'bold');
    document.setFontSize(11);
    document.text(event.date, colLeft, row1Y + 6);

    // TIME
    document.setTextColor(lightBlue.r, lightBlue.g, lightBlue.b);
    document.setFont('helvetica', 'normal');
    document.setFontSize(7);
    document.text('TIME', colRight, row1Y);

    document.setTextColor(white.r, white.g, white.b);
    document.setFont('helvetica', 'bold');
    document.setFontSize(11);
    document.text(event.time, colRight, row1Y + 6);

    // --- ROW 2 ---
    // VENUE
    document.setTextColor(lightBlue.r, lightBlue.g, lightBlue.b);
    document.setFont('helvetica', 'normal');
    document.setFontSize(7);
    document.text('VENUE', colLeft, row2Y);

    document.setTextColor(white.r, white.g, white.b);
    document.setFont('helvetica', 'bold');
    document.setFontSize(11);
    const venueText = `${event.venue}${event.location ? `, ${event.location}` : ''}`;
    const splitVenue = document.splitTextToSize(venueText, mainWidth / 2 - 20);
    document.text(splitVenue, colLeft, row2Y + 6);

    // TYPE
    document.setTextColor(lightBlue.r, lightBlue.g, lightBlue.b);
    document.setFont('helvetica', 'normal');
    document.setFontSize(7);
    document.text('TYPE', colRight, row2Y);

    document.setTextColor(brightGreen.r, brightGreen.g, brightGreen.b);
    document.setFont('helvetica', 'bold');
    document.setFontSize(11);
    document.text(ticket.ticketType.toUpperCase(), colRight, row2Y + 6);

    // --- ROW 3 ---
    // PRICE
    if (ticket.price !== undefined) {
      document.setTextColor(lightBlue.r, lightBlue.g, lightBlue.b);
      document.setFont('helvetica', 'normal');
      document.setFontSize(7);
      document.text('PRICE', colLeft, row3Y);

      document.setTextColor(white.r, white.g, white.b);
      document.setFont('helvetica', 'bold');
      document.setFontSize(11);
      document.text(`MWK ${Number(ticket.price).toLocaleString()}`, colLeft, row3Y + 6);
    }

    // ============================================
    // --- RIGHT GREEN SECTION (QR Stub) ---
    // ============================================

    const stubCenterX = left + mainWidth + (stubWidth / 2);

    // QR Code
    const qrSize = 32;
    const qrX = stubCenterX - qrSize / 2;
    const qrY = top + 12;

    document.setFillColor(white.r, white.g, white.b);
    document.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 2, 2, 'F');

    document.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // SCAN TO VERIFY
    document.setTextColor(darkBlue.r, darkBlue.g, darkBlue.b);
    document.setFont('helvetica', 'bold');
    document.setFontSize(7);
    document.text('SCAN TO VERIFY', stubCenterX, qrY + qrSize + 8, { align: 'center' });

    // Ticket Number — moved up slightly
    document.setFont('courier', 'bold');
    document.setFontSize(6.5);
    document.setTextColor(darkBlue.r, darkBlue.g, darkBlue.b);
    const displayCode = ticket.ticketNumber.replace(/[^A-Z0-9-]/gi, '').slice(0, 18);
    document.text(displayCode, stubCenterX, top + ticketHeight - 12, { align: 'center' });

    // --- PAGE FOOTER ---
    document.setTextColor(textGray.r, textGray.g, textGray.b);
    document.setFont('helvetica', 'normal');
    document.setFontSize(8);
    document.text('Present this ticket at the entrance.', pageWidth / 2, pageHeight - 15, { align: 'center' });
  }

  document.save(`${safeFileName(event.title)}-tickets.pdf`);
}