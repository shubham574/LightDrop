'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { generateQRCodeCanvas, getOptimalQRSize } from '@/lib/qr';

interface QRDisplayProps {
  data: string;
  size?: number;
  className?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export function QRDisplay({ data, size, className, onLoad, onError }: QRDisplayProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const hasRenderedRef = React.useRef(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!data || !canvasRef.current) return;

    let mounted = true;
    if (!hasRenderedRef.current) {
      setIsLoading(true);
    }
    setError(null);

    const optimalSize = size || getOptimalQRSize(data.length);

    generateQRCodeCanvas(data, canvasRef.current, {
      width: optimalSize,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then(() => {
        if (mounted) {
          hasRenderedRef.current = true;
          setIsLoading(false);
          onLoad?.();
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
          setIsLoading(false);
          onError?.(err);
        }
      });

    return () => {
      mounted = false;
    };
  }, [data, size, onLoad, onError]);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <canvas
        ref={canvasRef}
        className={cn(
          'qr-canvas rounded-lg border border-optical-border bg-white transition-opacity duration-150',
          isLoading && !hasRenderedRef.current && 'opacity-0'
        )}
        aria-label="QR code for file transfer"
      />
      {isLoading && !hasRenderedRef.current && (
        <div className="absolute inset-0 flex items-center justify-center bg-optical-panel/50 rounded-lg">
          <div className="w-8 h-8 border-4 border-optical-green border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-optical-darker/90 rounded-lg text-red-400 p-4 text-center text-sm">
          Failed to generate QR code
        </div>
      )}
    </div>
  );
}

interface QRDisplaySVGProps {
  data: string;
  size?: number;
  className?: string;
}

export function QRDisplaySVG({ data, size, className }: QRDisplaySVGProps) {
  const [svg, setSvg] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!data) return;

    setIsLoading(true);
    import('qrcode').then(({ toString }) => {
      toString(data, {
        type: 'svg',
        width: size || getOptimalQRSize(data.length),
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      }).then((result) => {
        setSvg(result);
        setIsLoading(false);
      });
    });
  }, [data, size]);

  if (isLoading) {
    return (
      <div className={cn('relative inline-flex items-center justify-center', className)}>
        <div className="w-64 h-64 animate-pulse bg-optical-panel rounded-lg border border-optical-border" />
      </div>
    );
  }

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} dangerouslySetInnerHTML={{ __html: svg }} />
  );
}