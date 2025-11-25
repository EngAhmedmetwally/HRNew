'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Camera, CheckCircle, XCircle } from 'lucide-react';
import jsQR from 'jsqr';

// This would come from settings in a real app
const QR_VALIDITY_SECONDS = 5;

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scanResult, setScanResult] = useState<{data: string, message: string} | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        toast({
            variant: 'destructive',
            title: 'خاصية الكاميرا غير مدعومة',
            description: 'متصفحك لا يدعم الوصول إلى الكاميرا.',
        });
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'تم رفض الوصول إلى الكاميرا',
          description: 'يرجى تمكين أذونات الكاميرا في إعدادات المتصفح الخاص بك لاستخدام هذا التطبيق.',
        });
      }
    };

    getCameraPermission();
    
    return () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, [toast]);

  const startScan = () => {
    setScanResult(null);
    setIsScanning(true);
  };

  const handleSuccessfulScan = (type: 'Check-in' | 'Check-out') => {
      // In a real app, this would write to Firestore.
      const now = new Date();
      const successMessage = `تم تسجيل ${type === 'Check-in' ? 'حضورك' : 'انصرافك'} بنجاح في ${now.toLocaleDateString('ar-EG')} الساعة ${now.toLocaleTimeString('ar-EG')}`;
      
      console.log(`Recording attendance: ${type} at ${now.toISOString()}`);
      
      toast({
          title: 'تم التسجيل بنجاح',
          description: successMessage,
          className: 'bg-green-500 text-white',
      });
      
      setScanResult({ data: `عملية ناجحة: ${type}`, message: successMessage });
  };
  
  useEffect(() => {
    let animationFrameId: number;

    const scan = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const context = canvas.getContext('2d');
        
        if (context) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code) {
            setIsScanning(false);
            const [timestampStr, secret] = code.data.split('-');
            const timestamp = parseInt(timestampStr, 10);
            const now = Date.now();

            if (secret === "your-secret-key" && (now - timestamp) < (QR_VALIDITY_SECONDS * 1000)) {
                // Simple logic to determine check-in or check-out based on time of day
                const hours = new Date().getHours();
                if (hours < 14) { // Assume check-in before 2 PM
                    handleSuccessfulScan('Check-in');
                } else {
                    handleSuccessfulScan('Check-out');
                }
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'QR Code غير صالح',
                    description: 'هذا الكود غير صالح أو منتهي الصلاحية.',
                });
                setScanResult({data: 'فشل التحقق', message: 'الكود المستخدم غير صالح أو انتهت صلاحيته.'});
            }
          }
        }
      }
      if (isScanning) {
        animationFrameId = requestAnimationFrame(scan);
      }
    };

    if (isScanning) {
      animationFrameId = requestAnimationFrame(scan);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning, toast]);

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera />
          تسجيل الحضور بالـ QR Code
        </CardTitle>
        <CardDescription>
          وجّه الكاميرا إلى الـ QR Code لتسجيل الحضور أو الانصراف.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
          <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
               <div className="w-64 h-64 border-4 border-dashed border-primary rounded-lg animate-pulse"></div>
            </div>
          )}
        </div>

        {hasCameraPermission === false && (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="h-4 w-4" />
            <AlertTitle>الوصول إلى الكاميرا مطلوب</AlertTitle>
            <AlertDescription>
              يرجى السماح بالوصول إلى الكاميرا لاستخدام هذه الميزة.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="mt-4">
            <Button onClick={startScan} disabled={!hasCameraPermission || isScanning} className="w-full">
                {isScanning ? 'جارٍ المسح...' : 'ابدأ المسح'}
            </Button>
        </div>

        {scanResult && (
             <Alert className={`mt-4 ${scanResult.data.includes('ناجحة') ? 'border-green-500 text-green-700 dark:border-green-600 dark:text-green-400' : 'border-destructive text-destructive'}`}>
                {scanResult.data.includes('ناجحة') ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                <AlertTitle>{scanResult.data.includes('ناجحة') ? 'تمت العملية بنجاح!' : 'فشل'}</AlertTitle>
                <AlertDescription className="break-words">
                    {scanResult.message}
                </AlertDescription>
            </Alert>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </CardContent>
    </Card>
  );
}
