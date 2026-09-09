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

export async function downloadTicketPdf(event: PdfTicketEvent, tickets: PdfTicket[]): Promise<void> {
  if (!tickets.length) throw new Error('No tickets available to download');
  const document = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();

  // Dark Blue colors
  const darkBlue = { r: 10, g: 25, b: 65 }; // Deep dark blue (#0A1941)
  const brightGreen = { r: 0, g: 204, b: 136 }; // Bright green (#00CC88)
  const darkGreen = { r: 0, g: 170, b: 110 }; // Darker green for text (#00AA6E)
  const mutedGray = { r: 150, g: 150, b: 180 }; // Muted gray
  const white = { r: 255, g: 255, b: 255 };
  const lightBlueWhite = { r: 200, g: 215, b: 255 }; // Light blue-white

  for (const [index, ticket] of tickets.entries()) {
    if (index > 0) document.addPage();
    
    const qrDataUrl = await QRCode.toDataURL(
      `${window.location.origin}/tickets/verify/${encodeURIComponent(ticket.token)}`, 
      { 
        errorCorrectionLevel: 'H', 
        margin: 1, 
        width: 500 
      }
    );
    
    const left = 18;
    const top = 28;
    const cardWidth = pageWidth - 36;
    const cardHeight = 112;
    const radius = 5;

    // Card background - Dark Blue
    document.setFillColor(darkBlue.r, darkBlue.g, darkBlue.b);
    document.roundedRect(left, top, cardWidth, cardHeight, radius, radius, 'F');
    
    // Accent stripe - Green
    document.setFillColor(brightGreen.r, brightGreen.g, brightGreen.b);
    document.rect(left, top, 5, cardHeight, 'F');
    
    // "ZOSAVUTA / DIGITAL ENTRY PASS" text using Green
    document.setTextColor(brightGreen.r, brightGreen.g, brightGreen.b);
    document.setFont('helvetica', 'bold');
    document.setFontSize(9);
    document.text('ZOSAVUTA  /  DIGITAL ENTRY PASS', left + 14, top + 16);
    
    // Event title in White
    document.setTextColor(white.r, white.g, white.b);
    document.setFontSize(21);
    document.text(event.title.slice(0, 42), left + 14, top + 31);
    
    // Event details in Light Blue-White
    document.setTextColor(lightBlueWhite.r, lightBlueWhite.g, lightBlueWhite.b);
    document.setFontSize(10);
    document.setFont('helvetica', 'normal');
    document.text(`${event.date}  |  ${event.time}`, left + 14, top + 46);
    document.text(`${event.venue}${event.location ? `, ${event.location}` : ''}`.slice(0, 55), left + 14, top + 55);
    
    // Divider line in Green with dashes
    document.setDrawColor(darkGreen.r, darkGreen.g, darkGreen.b);
    document.setLineDashPattern([1, 2], 0);
    document.line(left + 14, top + 65, left + cardWidth - 88, top + 65);
    document.setLineDashPattern([], 0);
    
    // Labels using Green
    document.setTextColor(darkGreen.r, darkGreen.g, darkGreen.b);
    document.setFont('helvetica', 'bold');
    document.setFontSize(9);
    document.text('TICKET TYPE', left + 14, top + 80);
    document.text('TICKET NUMBER', left + 68, top + 80);
    
    // Ticket details in White
    document.setTextColor(white.r, white.g, white.b);
    document.setFontSize(12);
    document.text(ticket.ticketType, left + 14, top + 91);
    document.setFont('courier', 'bold');
    document.text(ticket.ticketNumber.slice(0, 23), left + 68, top + 91);
    
    if (ticket.price !== undefined) {
      document.setFont('helvetica', 'normal');
      document.setFontSize(9);
      document.text(`MWK ${Number(ticket.price).toLocaleString()}`, left + 14, top + 102);
    }
    
    // QR Code
    document.addImage(qrDataUrl, 'PNG', left + cardWidth - 72, top + 17, 55, 55);
    
    // "SCAN TO VERIFY" text using Green
    document.setTextColor(brightGreen.r, brightGreen.g, brightGreen.b);
    document.setFont('helvetica', 'bold');
    document.setFontSize(7);
    document.text('SCAN TO VERIFY', left + cardWidth - 72, top + 80);
    
    // Footer text using muted gray
    document.setTextColor(mutedGray.r, mutedGray.g, mutedGray.b);
    document.setFont('helvetica', 'normal');
    document.setFontSize(8);
    document.text('Present this ticket at the entrance.', left, pageHeight - 20);
  }

  document.save(`${safeFileName(event.title)}-tickets.pdf`);
}