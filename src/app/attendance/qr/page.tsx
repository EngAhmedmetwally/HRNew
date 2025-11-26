'use client';

import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useEffect, useState, useRef, useCallback } from "react";
import { useDoc, useFirebase, useUser, useMemoFirebase } from "@/firebase";
import { addDoc, collection, doc, Timestamp } from "firebase/firestore";
import { Loader2, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function QrCodePage() {
  const { firestore } = useFirebase();
  const { user, roles, isUserLoading } = useUser();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);
  
  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'global');
  }, [firestore]);

  const { data: storedSettings } = useDoc(settingsDocRef);
  const qrValiditySeconds = storedSettings?.settings?.qrRefreshRate || 10;
  
  const canView = roles.isAdmin || roles.isHr;

  const generateQrCode = useCallback(async () => {
    if (!firestore || !isMountedRef.current || !canView) return;
    
    // Only show loader on the very first load
    if (!qrCodeUrl) {
       setIsLoading(true);
    }

    try {
      const now = Timestamp.now();
      const validUntil = new Timestamp(now.seconds + qrValiditySeconds, now.nanoseconds);
      const secret = Math.random().toString(36).substring(2);

      const qrCodeDoc = {
        sessionId: `session-${Date.now()}`,
        date: now,
        type: "attendance",
        token: secret,
        validUntil: validUntil,
      };

      const qrCollection = collection(firestore, 'qrCodes');
      const docRef = await addDoc(qrCollection, qrCodeDoc);

      const dataToEncode = `${docRef.id}|${secret}`;
      const newQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(dataToEncode)}`;

      if (isMountedRef.current) {
        setQrCodeUrl(newQrCodeUrl);
        setCountdown(qrValiditySeconds);
        setIsLoading(false);
        // Clear previous timer before setting a new one
        if(timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(generateQrCode, qrValiditySeconds * 1000);
      }

    } catch (error) {
      console.error("Error generating QR code:", error);
      if (isMountedRef.current) {
        setIsLoading(false);
         // Clear previous timer before setting a new one
        if(timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(generateQrCode, qrValiditySeconds * 1000);
      }
    }
  }, [firestore, canView, qrValiditySeconds]);

  useEffect(() => {
    isMountedRef.current = true;
    if (firestore && canView && storedSettings !== undefined) {
      generateQrCode();
    } else if (!isUserLoading && !canView) {
        setIsLoading(false);
    }

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [firestore, generateQrCode, canView, isUserLoading, storedSettings]);

  useEffect(() => {
    if (isLoading || !qrCodeUrl) return;

    const countdownTimer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [isLoading, qrCodeUrl]);

  if (isUserLoading || (canView && storedSettings === undefined)) {
    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  if (!canView) {
    return (
        <div className="flex justify-center items-center h-full p-4">
            <Alert variant="destructive" className="max-w-md w-full">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>وصول مرفوض</AlertTitle>
                <AlertDescription>
                    ليس لديك الصلاحية لعرض هذه الصفحة.
                </AlertDescription>
            </Alert>
        </div>
    );
  }


  return (
    <div className="flex justify-center items-center h-full p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>إنشاء QR Code للحضور</CardTitle>
            <CardDescription>
              {`يتم تحديث الكود تلقائيًا كل ${qrValiditySeconds} ثوانٍ.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-lg border bg-card p-4 shadow-inner flex items-center justify-center h-[288px] w-[288px]">
              {isLoading ? (
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              ) : qrCodeUrl ? (
                <Image
                  src={qrCodeUrl}
                  alt="Dynamic QR Code"
                  width={256}
                  height={256}
                  className="rounded-md"
                  unoptimized // Recommended for dynamically generated images from external services
                  key={qrCodeUrl} // Add key to force re-render on URL change
                />
              ) : (
                <div className="h-[256px] w-[256px] bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                    فشل إنشاء الكود
                </div>
              )}
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
                {isLoading ? 'جاري إنشاء الكود...' : `صالح لمدة ${countdown} ثانية`}
            </p>
          </CardContent>
        </Card>
      </div>
  );
}
