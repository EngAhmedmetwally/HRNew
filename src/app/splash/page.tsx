'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthBackground } from '@/components/auth/auth-background';
import { Building, Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';
import { FingerprintIcon } from '@/components/auth/fingerprint-icon';

export default function SplashPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        // The redirection logic is now handled in the login page's useEffect
        // for better consistency and to handle device verification.
        // This splash page now primarily serves as a loading indicator.
        // If the user lands here directly while logged in, the login page's
        // useEffect will trigger and redirect them.
         router.replace('/login'); 
      } else {
        // If auth fails or user signs out, go back to login.
        router.replace('/login');
      }
    }
  }, [user, isUserLoading, router]);

  // The redirection logic is now in `login/page.tsx`, so we just show the loading screen
  // until `isUserLoading` is false and the user object is processed there.

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 bg-background" />
       <div className="z-10 flex flex-col items-center text-center">
            <FingerprintIcon className="h-24 w-24 mb-6 animate-pulse text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground">HighClass HR</h1>
            <div className='flex items-center gap-2 text-muted-foreground mt-4'>
                <Loader2 className="h-5 w-5 animate-spin" />
                <p>جاري المصادقة وتجهيز لوحة التحكم الخاصة بك...</p>
            </div>
        </div>
    </div>
  );
}
