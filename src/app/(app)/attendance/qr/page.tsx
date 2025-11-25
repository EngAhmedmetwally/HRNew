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

export default function QrCodePage() {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [countdown, setCountdown] = useState(5);

  const generateQrCode = () => {
    const timestamp = Date.now();
    const secret = "your-secret-key"; // In a real app, this should be more secure
    const dataToEncode = `${timestamp}-${secret}`;
    const newQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dataToEncode)}`;
    setQrCodeUrl(newQrCodeUrl);
    setCountdown(5);
  };

  useEffect(() => {
    generateQrCode();
    const interval = setInterval(generateQrCode, 5000); // Generate new QR code every 5 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [qrCodeUrl]);


  return (
    <div className="flex justify-center items-center h-full">
        <Card className="max-w-sm w-full">
          <CardHeader className="text-center">
            <CardTitle>إنشاء QR Code للحضور</CardTitle>
            <CardDescription>
              يتم تحديث الكود تلقائيًا كل 5 ثوانٍ.
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
