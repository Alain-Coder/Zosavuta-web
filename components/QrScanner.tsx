'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

type Props = {
    onDecoded: (value: string) => void;
    onError?: (message: string) => void;
    /** When true, decoded values are ignored (camera stays on). */
    paused?: boolean;
};

export function QrScanner({ onDecoded, onError, paused = false }: Props) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerIdRef = useRef<string>(
        `QR-reader-Mw-${Math.random().toString(36).slice(2)}`
    );
    const pausedRef = useRef(paused);
    const onDecodedRef = useRef(onDecoded);
    const onErrorRef = useRef(onError);
    const lastValueRef = useRef<string>('');
    const lastAtRef = useRef<number>(0);
    const isRunningRef = useRef(false);

    // Keep latest callbacks / paused flag without re-running the mount effect
    useEffect(() => { pausedRef.current = paused; }, [paused]);
    useEffect(() => { onDecodedRef.current = onDecoded; }, [onDecoded]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);

    useEffect(() => {
        const regionId = containerIdRef.current;
        const container = document.getElementById(regionId);
        if (!container) return;

        // FIX 1: Bail out if already initialized (Strict Mode re-entry guard)
        if (scannerRef.current) return;

        // FIX 2: Clear any orphaned DOM left by a previous instance
        if (container.innerHTML !== '') {
            container.innerHTML = '';
        }

        let cancelled = false;
        const scanner = new Html5Qrcode(regionId, {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            verbose: false,
        });
        scannerRef.current = scanner;

        // FIX 3: Small delay so a prior async stop()/clear() can settle
        const timer = setTimeout(() => {
            if (cancelled) return;

            scanner
                .start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        if (pausedRef.current) return; // ignore while verifying
                        const now = Date.now();
                        if (
                            decodedText === lastValueRef.current &&
                            now - lastAtRef.current < 2500
                        )
                            return;
                        lastValueRef.current = decodedText;
                        lastAtRef.current = now;
                        onDecodedRef.current(decodedText);
                    },
                    () => { /* per-frame decode failures — ignore */ }
                )
                .then(() => {
                    if (!cancelled) isRunningRef.current = true;
                })
                .catch((err) => {
                    if (cancelled) return;
                    scannerRef.current = null; // allow retry on next mount
                    onErrorRef.current?.(err?.message || 'Unable to access camera');
                });
        }, 50);

        return () => {
            cancelled = true;
            clearTimeout(timer);
            const s = scannerRef.current;
            scannerRef.current = null;
            if (s && isRunningRef.current) {
                isRunningRef.current = false;
                s.stop()
                    .then(() => s.clear())
                    .catch(() => { /* already stopped / not started */ });
            }
        };
        // Mount once per component lifetime. Paused is handled via ref.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="mt-4 overflow-hidden rounded-lg border bg-black">
            {/* FIX 4: This div must stay mounted — html5-qrcode owns its children.
          Never conditionally unmount it. */}
            <div
                id={containerIdRef.current}
                className="w-full [&_video]:w-full [&_video]:rounded-lg"
            />
        </div>
    );
}