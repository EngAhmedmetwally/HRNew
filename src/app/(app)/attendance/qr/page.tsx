'use client';

import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useFirebase } from "@/firebase/provider";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { Loader2 } from "lucide-react";

// This would come from settings in a real app
const QR_VALIDITY_SECONDS = 5;

export default function QrCodePage() {
  const { firestore } = useFirebase();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [countdown, setCountdown] = useState(QR_VALIDITY_SECONDS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let timerId: NodeJS.Timeout;

    const generateQrCode = async () => {
        if (!firestore) return;
        setIsLoading(true);

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
            
            if (isMounted) {
                setQrCodeUrl(newQrCodeUrl);
                setCountdown(QR_VALIDITY_SECONDS);
                setIsLoading(false);
            }

        } catch (error) {
            console.error("Error generating QR code:", error);
            if(isMounted) setIsLoading(false);
        }
    };
    
    const runGenerator = async () => {
        if(firestore) {
            await generateQrCode();
            timerId = setInterval(generateQrCode, QR_VALIDITY_SECONDS * 1000);
        }
    };

    runGenerator();

    return () => {
      isMounted = false;
      clearInterval(timerId);
    };
  }, [firestore]);

  useEffect(() => {
    if (!qrCodeUrl) return;
    
    const countdownTimer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    
    return () => clearInterval(countdownTimer);
  }, [qrCodeUrl]);


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
