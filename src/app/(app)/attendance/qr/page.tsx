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
import { setDocumentNonBlocking } from "@/firebase";

// This would come from settings in a real app
const QR_VALIDITY_SECONDS = 5;

export default function QrCodePage() {
  const { firestore } = useFirebase();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [countdown, setCountdown] = useState(QR_VALIDITY_SECONDS);

  const generateQrCode = async () => {
    if (!firestore) return;

    try {
        const now = Timestamp.now();
        const validUntil = new Timestamp(now.seconds + QR_VALIDITY_SECONDS, now.nanoseconds);
        const secret = Math.random().toString(36).substring(2); // More secure token
        
        const qrCodeDoc = {
            sessionId: "session-123", // In a real app, this would be dynamic
            date: now,
            type: "attendance", // 'check-in' or 'check-out' could be determined dynamically
            token: secret,
            validUntil: validUntil,
        };

        const qrCollection = collection(firestore, 'qrCodes');
        const docRef = await addDoc(qrCollection, qrCodeDoc); // We need the ID for the QR data

        const dataToEncode = `${docRef.id}|${secret}`;
        
        const newQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dataToEncode)}`;
        
        setQrCodeUrl(newQrCodeUrl);
        setCountdown(QR_VALIDITY_SECONDS);

    } catch (error) {
        console.error("Error generating QR code:", error);
    }
  };

  useEffect(() => {
    if (firestore) {
      generateQrCode();
      const interval = setInterval(generateQrCode, QR_VALIDITY_SECONDS * 1000);
      return () => clearInterval(interval);
    }
  }, [firestore]);

  useEffect(() => {
    if(!qrCodeUrl) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [qrCodeUrl]);


  return (
    <div className="flex justify-center items-center h-full">
        <Card className="max-w-sm w-full">
          <CardHeader className="text-center">
            <CardTitle>إنشاء QR Code للحضور</CardTitle>
            <CardDescription>
              يتم تحديث الكود تلقائيًا كل {QR_VALIDITY_SECONDS} ثوانٍ.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-lg border bg-card p-4 shadow-inner">
              {qrCodeUrl ? (
                <Image
                  src={qrCodeUrl}
                  alt="Dynamic QR Code"
                  width={200}
                  height={200}
                  className="rounded-md"
                />
              ) : (
                <div className="h-[200px] w-[200px] bg-muted animate-pulse rounded-md" />
              )}
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              صالح لمدة {countdown} ثانية
            </p>
          </CardContent>
        </Card>
      </div>
  );
}
