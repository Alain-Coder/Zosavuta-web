'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MOCK_TICKETS } from '@/lib/bus/mock-data';

export default function TicketValidationPage() {
  const [ticketId, setTicketId] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<'success' | 'error' | 'info'>('info');
  const [scannerActive, setScannerActive] = useState(false);
  const [scanSupported, setScanSupported] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setScanSupported(typeof window !== 'undefined' && 'BarcodeDetector' in window);
  }, []);

  useEffect(() => {
    let scanInterval: number | null = null;
    const windowAny = window as any;
    const detector = scanSupported && typeof windowAny.BarcodeDetector !== 'undefined'
      ? new windowAny.BarcodeDetector({ formats: ['qr_code'] })
      : null;

    async function scanFrame() {
      if (!videoRef.current || !detector) {
        return;
      }

      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const rawValue = barcodes[0].rawValue;
          stopCamera();
          validateTicketString(rawValue);
        }
      } catch (error) {
        setScanMessage('Scanning failed. Please try again or use manual input.');
        console.error('Barcode detection failed', error);
      }
    }

    if (scannerActive && detector) {
      scanInterval = window.setInterval(scanFrame, 800);
    }

    return () => {
      if (scanInterval) {
        window.clearInterval(scanInterval);
      }
    };
  }, [scannerActive, scanSupported]);

  const validateTicketString = (value: string) => {
    const trimmedValue = value.trim();
    setTicketId(trimmedValue);
    const ticket = MOCK_TICKETS.find(
      (item) => item.id === trimmedValue || item.qrCode === trimmedValue,
    );

    if (ticket) {
      setStatus('success');
      setResult(
        `Ticket ${ticket.id} is valid. Seat ${ticket.seatNumber ?? 'unassigned'} and booking ${ticket.bookingId}.`,
      );
      setScanMessage('Ticket scanned successfully.');
    } else {
      setStatus('error');
      setResult('Ticket not found. Please verify the ticket ID or QR code.');
      setScanMessage('Scanned code could not be validated.');
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedId = ticketId.trim();

    if (!trimmedId) {
      setStatus('error');
      setResult('Please enter a ticket ID or QR code string.');
      return;
    }

    validateTicketString(trimmedId);
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanMessage('Camera access is not supported by this browser.');
      return;
    }

    setScanMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScannerActive(true);
    } catch (error) {
      setScanMessage('Unable to access camera. Please allow camera permissions.');
      console.error('Camera access error', error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScannerActive(false);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-primary">Ticket Validation</h1>
        <p className="text-muted-foreground max-w-2xl">
          Use this page to verify bus tickets quickly. Open the camera to scan the ticket QR code, or enter the ticket ID manually.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl w-full mx-auto">
        <div className="space-y-2">
          <label htmlFor="ticketId" className="block text-sm font-medium text-foreground">
            Ticket ID or QR code
          </label>
          <input
            id="ticketId"
            type="text"
            value={ticketId}
            onChange={(event) => setTicketId(event.target.value)}
            placeholder="e.g. ticket1 or QR123ABC"
            className="w-full rounded-lg border border-border/80 bg-card px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={startCamera}
            className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 sm:w-auto"
          >
            Scan Ticket
          </button>
          <button
            type="submit"
            className="w-full rounded-lg border border-border/80 bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary sm:w-auto"
          >
            Validate Ticket
          </button>
        </div>

        {scannerActive && (
          <div className="relative rounded-xl border border-border/80 bg-slate-950/80 p-4">
            <video
              ref={videoRef}
              className="min-h-[240px] w-full rounded-xl object-cover"
              muted
              playsInline
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
              <div className="h-48 w-full max-w-[320px] rounded-[28px] border-4 border-primary/80 bg-white/10 shadow-xl backdrop-blur-sm animate-pulse sm:animate-none" />
              <div className="rounded-full bg-black/70 px-4 py-2 text-center text-xs font-medium text-white shadow-sm sm:text-sm">
                Align the ticket QR code inside the frame and hold still.
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Point the camera at the ticket QR code.</p>
              <button
                type="button"
                onClick={stopCamera}
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 sm:w-auto"
              >
                Stop
              </button>
            </div>
          </div>
        )}

        {!scanSupported && (
          <div className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            Camera scanning requires a browser with the Web Barcode Detector API. Please use a supported browser or validate manually.
          </div>
        )}

        {scanMessage && (
          <div className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {scanMessage}
          </div>
        )}

        {result && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              status === 'success'
                ? 'border-green-300 bg-green-50 text-green-700'
                : status === 'error'
                ? 'border-red-300 bg-red-50 text-red-700'
                : 'border-slate-300 bg-slate-50 text-slate-700'
            }`}
          >
            {result}
          </div>
        )}
      </form>
    </div>
  );
}
