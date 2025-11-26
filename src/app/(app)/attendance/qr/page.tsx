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
import { useFirebase, useUser } from "@/firebase";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { Loader2, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


// This would come from settings in a real app
const QR_VALIDITY_SECONDS = 5;

export default function QrCodePage() {
  const { firestore } = useFirebase();
  const { user, roles, isUserLoading } = useUser();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [countdown, setCountdown] = useState(QR_VALIDITY_SECONDS);
  const [isLoading, setIsLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);
  
  const canView = roles.isAdmin || roles.isHr;

  const generateQrCode = useCallback(async () => {
    if (!firestore || !isMountedRef.current || !canView) return;
    
    // Set loading to true only if it's not the initial load, to avoid flicker
    if (qrCodeUrl) {
       // No need to set loading, it will be a fast swap
    } else {
       setIsLoading(true);
    }

    try {
      const now = Timestamp.now();
      const validUntil = new Timestamp(now.seconds + QR_VALIDITY_SECONDS, now.nanoseconds);
      const secret = Math.random().toString(36).substring(2);

      const qrCodeDoc = {
        sessionId: "session-123",
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
        setCountdown(QR_VALIDITY_SECONDS);
        setIsLoading(false);
        // Schedule the next generation after this one is successful
        timerRef.current = setTimeout(generateQrCode, QR_VALIDITY_SECONDS * 1000);
      }

    } catch (error) {
      console.error("Error generating QR code:", error);
      if (isMountedRef.current) {
        setIsLoading(false);
        // Retry after a short delay in case of an error
        timerRef.current = setTimeout(generateQrCode, QR_VALIDITY_SECONDS * 1000);
      }
    }
  }, [firestore, qrCodeUrl, canView]);

  useEffect(() => {
    isMountedRef.current = true;
    if (firestore && canView) {
      generateQrCode();
    } else if (!isUserLoading) {
        setIsLoading(false);
    }

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [firestore, generateQrCode, canView, isUserLoading]);

  useEffect(() => {
    if (isLoading || !qrCodeUrl) return;

    const countdownTimer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [isLoading, qrCodeUrl]);

  if (isUserLoading) {
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
              يتم تحديث الكود تلقائيًا كل {QR_VALIDITY_SECONDS} ثوانٍ.
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
