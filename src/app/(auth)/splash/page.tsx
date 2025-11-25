'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FingerprintAnimation } from '@/components/auth/fingerprint-animation';
import { Building } from 'lucide-react';

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/dashboard');
    }, 2500); // Wait for 2.5 seconds before redirecting

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 z-0">
        <FingerprintAnimation />
      </div>
       <div className="z-10 flex flex-col items-center text-center">
            <div className="mb-4 flex items-center gap-2 text-2xl font-semibold text-foreground">
                <Building className="h-8 w-8" />
                <span>HR Pulse</span>
            </div>
            <p className="text-muted-foreground">جاري المصادقة وتجهيز لوحة التحكم الخاصة بك...</p>
        </div>
    </div>
  );
}
