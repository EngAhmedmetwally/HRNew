'use client';

import { Fingerprint } from 'lucide-react';

export function FingerprintAnimation() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-background">
      <div className="absolute inset-0 flex items-center justify-center">
        <Fingerprint className="h-[80vmin] w-[80vmin] text-primary/5 animate-pulse" />
      </div>
      <div
        className="absolute inset-0 animate-scan-line"
        style={{
          background: 'linear-gradient(to bottom, transparent, hsl(var(--primary) / 0.1), transparent)',
        }}
      />
      <style jsx>{`
        @keyframes scan-line {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
        .animate-scan-line {
          animation: scan-line 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
