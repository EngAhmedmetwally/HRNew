'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthBackground } from '@/components/auth/auth-background';
import { Building, Loader2 } from 'lucide-react';

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
      <AuthBackground />
       <div className="z-10 flex flex-col items-center text-center">
            <div className="mb-4 flex items-center gap-2 text-2xl font-semibold text-foreground">
                <Building className="h-8 w-8" />
                <span>HR Pulse</span>
            </div>
            <div className='flex items-center gap-2 text-muted-foreground'>
                <Loader2 className="h-5 w-5 animate-spin" />
                <p>جاري المصادقة وتجهيز لوحة التحكم الخاصة بك...</p>
            </div>
        </div>
    </div>
  );
}
