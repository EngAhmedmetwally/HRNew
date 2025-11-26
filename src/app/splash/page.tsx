'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthBackground } from '@/components/auth/auth-background';
import { Building, Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';
import { FingerprintIcon } from '@/components/auth/fingerprint-icon';

export default function SplashPage() {
  const router = useRouter();
  const { user, roles, isUserLoading } = useUser();

  useEffect(() => {
    // This component's only job is to wait for the user state to be confirmed
    // and then redirect. The actual redirection logic is now inside the login page's
    // useEffect hook, making this component a simple "wait and see".
    if (!isUserLoading) {
      if (user) {
        if (roles.isAdmin || roles.isHr) {
          router.replace('/dashboard');
        } else {
          router.replace('/scan');
        }
      } else {
        // If for some reason auth fails, send back to login.
        router.replace('/login');
      }
    }
  }, [user, roles, isUserLoading, router]);

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
