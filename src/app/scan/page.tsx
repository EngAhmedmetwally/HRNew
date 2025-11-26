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
import { useFirebase, useUser, setDocumentNonBlocking } from '@/firebase';
import { doc, getDoc, serverTimestamp, setDoc, getDocs, collection, query, where, Timestamp } from 'firebase/firestore';


export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scanResult, setScanResult] = useState<{data: string, message: string} | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user } = useUser();

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

    const handleSuccessfulScan = async (qrId: string, qrToken: string) => {
    if (!firestore) return;
    
    const qrDocRef = doc(firestore, "qrCodes", qrId);
    const qrDocSnap = await getDoc(qrDocRef);

    if (!qrDocSnap.exists() || qrDocSnap.data().token !== qrToken) {
        setScanResult({data: 'فشل التحقق', message: 'الكود المستخدم غير صالح أو مزور.'});
        toast({ variant: 'destructive', title: 'QR Code غير صالح' });
        return;
    }

    const qrData = qrDocSnap.data();
    const now = Timestamp.now();
    
    if (now > qrData.validUntil) {
        setScanResult({data: 'فشل التحقق', message: 'الكود المستخدم منتهي الصلاحية.'});
        toast({ variant: 'destructive', title: 'QR Code منتهي الصلاحية' });
        return;
    }
    
    // Logic to record attendance
    await recordAttendance();
  };

  const recordAttendance = async () => {
      if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'يجب تسجيل الدخول أولاً' });
        return;
      };

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      
      const workDayPath = `/workDays/${year}/${month}/${day}/${user.uid}`;
      const workDayRef = doc(firestore, workDayPath);

      // Fetch deduction policies to calculate delay
      const policiesRef = collection(firestore, "deductionPolicies");
      const policiesSnapshot = await getDocs(policiesRef);
      // Assuming one global policy for simplicity
      const policy = policiesSnapshot.docs[0]?.data();
      const gracePeriod = policy?.gracePeriodMinutes || 15;
      
      // Assuming check-in time is 09:00 for calculation
      const checkInDeadline = new Date(now);
      checkInDeadline.setHours(9, gracePeriod, 0, 0); // 09:00 + grace period

      let delayMinutes = 0;
      if (now > checkInDeadline) {
          delayMinutes = Math.floor((now.getTime() - checkInDeadline.getTime()) / (1000 * 60)) + gracePeriod;
      }

      try {
          // This simulates a check-in. A real app would check if a record exists to decide between check-in/out
          const workDayData = {
              id: user.uid,
              date: serverTimestamp(),
              employeeId: user.uid,
              checkInTime: serverTimestamp(),
              checkOutTime: null,
              totalWorkHours: 0,
              delayMinutes: delayMinutes,
              overtimeHours: 0
          };
          
          setDocumentNonBlocking(workDayRef, workDayData, { merge: true });

          const successMessage = `تم تسجيل حضورك بنجاح في ${now.toLocaleDateString('ar-EG')} الساعة ${now.toLocaleTimeString('ar-EG')}. دقائق التأخير: ${delayMinutes}`;
          toast({
              title: 'تم التسجيل بنجاح',
              description: successMessage,
              className: 'bg-green-500 text-white',
          });
          setScanResult({ data: `عملية ناجحة`, message: successMessage });
      } catch (e) {
          console.error("Error recording attendance:", e);
          toast({ variant: 'destructive', title: 'خطأ في التسجيل', description: 'لم نتمكن من تسجيل حضورك.' });
          setScanResult({data: 'فشل التسجيل', message: 'حدث خطأ أثناء محاولة تسجيل حضورك في قاعدة البيانات.'});
      }
  };
  
  useEffect(() => {
    let animationFrameId: number;

    const scan = async () => {
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
            const [qrId, qrToken] = code.data.split('|');

            if (qrId && qrToken) {
              await handleSuccessfulScan(qrId, qrToken);
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'QR Code غير صالح',
                    description: 'هذا الكود لا يتبع التنسيق المطلوب.',
                });
                setScanResult({data: 'فشل التحقق', message: 'تنسيق بيانات الكود غير صحيح.'});
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
  }, [isScanning, firestore]);

  return (
    <Card className="max-w-md mx-auto w-full">
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
               <div className="w-48 h-48 sm:w-64 sm:h-64 border-4 border-dashed border-primary rounded-lg animate-pulse"></div>
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
            <Button onClick={startScan} disabled={!hasCameraPermission || isScanning || !user} className="w-full">
                {isScanning ? 'جارٍ المسح...' : 'ابدأ المسح'}
            </Button>
            {!user && <p className="text-center text-red-500 text-sm mt-2">يجب تسجيل الدخول أولاً لاستخدام الماسح.</p>}
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
