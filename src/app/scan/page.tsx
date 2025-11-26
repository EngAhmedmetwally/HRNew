'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Camera, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import jsQR from 'jsqr';
import { useFirebase, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, getDoc, setDoc, getDocs, collection, query, where, Timestamp, updateDoc } from 'firebase/firestore';
import type { Employee } from '@/lib/types';
import { useRouter } from 'next/navigation';


export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scanResult, setScanResult] = useState<{data: string, message: string} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Used to prevent multiple submissions
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [isUserLoading, user, router]);


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
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasCameraPermission(true);
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

    if(user) {
        getCameraPermission();
    }
    
    return () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, [toast, user]);
  
  const recordAttendance = useCallback(async (): Promise<string> => {
    if (!firestore || !user) {
        throw new Error('لم يتم العثور على جلسة مستخدم صالحة.');
    };

    const employeeDocRef = doc(firestore, 'employees', user.uid);
    const settingsDocRef = doc(firestore, 'settings', 'global');
    
    const [employeeSnap, settingsSnap] = await Promise.all([
        getDoc(employeeDocRef).catch(e => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: employeeDocRef.path, operation: 'get' }));
            throw e;
        }),
        getDoc(settingsDocRef).catch(e => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({ path: settingsDocRef.path, operation: 'get' }));
             throw e;
        })
    ]);
    
    if (!employeeSnap.exists()) {
        throw new Error('لم يتم العثور على بيانات الموظف. يرجى المحاولة مرة أخرى.');
    }
    if (!settingsSnap.exists()) {
        throw new Error('لم يتم العثور على إعدادات النظام.');
    }
    const employee = employeeSnap.data() as Employee;
    const storedSettings = settingsSnap.data();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const workDaysQuery = query(
        collection(firestore, 'workDays'),
        where('employeeId', '==', user.uid),
        where('date', '>=', Timestamp.fromDate(today))
    );

    const querySnapshot = await getDocs(workDaysQuery);
    const todayRecord = querySnapshot.docs.length > 0 ? querySnapshot.docs[0] : null;

    if (todayRecord && todayRecord.data().checkOutTime) {
        throw new Error('لقد قمت بتسجيل الحضور والانصراف لهذا اليوم بالفعل.');
    }
    
    if (todayRecord) { // Record exists, so this is a check-out
        const checkInTime = (todayRecord.data().checkInTime as Timestamp).toDate();
        const checkOutTime = now;
        const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

        const updateData = {
            checkOutTime: Timestamp.fromDate(checkOutTime),
            totalWorkHours: workHours
        };

        await updateDoc(todayRecord.ref, updateData).catch(e => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: todayRecord.ref.path, operation: 'update', requestResourceData: updateData }));
            throw e;
        });
        
        return `تم تسجيل انصرافك بنجاح في ${now.toLocaleDateString('ar-EG')} الساعة ${now.toLocaleTimeString('ar-EG')}.`;
    } else { // No record, so this is a check-in
        const isPartTimeWithCustomTime = employee.contractType === 'part-time' && employee.customCheckInTime;
        const checkInTimeSetting = isPartTimeWithCustomTime ? employee.customCheckInTime! : storedSettings.settings.checkInTime;
        
        const { gracePeriod } = storedSettings.settings;
        const [hours, minutes] = checkInTimeSetting.split(':').map(Number);
        
        const checkInDeadline = new Date(now);
        checkInDeadline.setHours(hours, minutes + (gracePeriod || 0), 0, 0);

        let delayMinutes = 0;
        if (now > checkInDeadline) {
            delayMinutes = Math.floor((now.getTime() - checkInDeadline.getTime()) / (1000 * 60));
        }

        const workDayData = {
            date: Timestamp.fromDate(now),
            employeeId: user.uid,
            checkInTime: Timestamp.fromDate(now),
            checkOutTime: null,
            totalWorkHours: 0,
            delayMinutes: delayMinutes,
            overtimeHours: 0
        };
        
        const newWorkDayRef = doc(collection(firestore, 'workDays'));
        await setDoc(newWorkDayRef, workDayData).catch(e => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: newWorkDayRef.path, operation: 'create', requestResourceData: workDayData }));
            throw e;
        });

        return `تم تسجيل حضورك بنجاح. وقت الحضور: ${now.toLocaleTimeString('ar-EG')}. دقائق التأخير: ${delayMinutes}`;
    }
  }, [firestore, user]);


  const handleSuccessfulScan = useCallback(async (qrId: string, qrToken: string) => {
    if (!firestore || !user) {
        const errorMsg = 'بيانات المستخدم غير مكتملة.';
        setScanResult({data: 'فشل التحقق', message: errorMsg});
        toast({ variant: 'destructive', title: 'خطأ', description: errorMsg });
        return;
    }

    try {
        const qrDocRef = doc(firestore, "qrCodes", qrId);
        const qrDocSnap = await getDoc(qrDocRef).catch(e => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: qrDocRef.path, operation: 'get' }));
            throw e;
        });

        if (!qrDocSnap.exists() || qrDocSnap.data().token !== qrToken) {
            setScanResult({data: 'فشل التحقق', message: 'الكود المستخدم غير صالح أو مزور.'});
            return;
        }

        const qrData = qrDocSnap.data();
        const now = Timestamp.now();
        
        if (now.toMillis() > qrData.validUntil.toMillis()) {
            setScanResult({data: 'فشل التحقق', message: 'الكود المستخدم منتهي الصلاحية.'});
            return;
        }
        
        const successMessage = await recordAttendance();
        setScanResult({ data: `عملية ناجحة`, message: successMessage });
        toast({ title: 'تم التسجيل بنجاح', description: successMessage, className: 'bg-green-500 text-white' });

    } catch(error: any) {
        const errorMessage = error.message || 'حدث خطأ غير متوقع أثناء معالجة الكود.';
        setScanResult({data: 'فشل', message: errorMessage });
        // The toast is removed to avoid duplicating the error message shown by the dev overlay.
        // This will catch permission errors from the getDoc call on qrCodes
        if (!(error instanceof FirestorePermissionError)) {
             console.error("An error occurred during QR scan handling:", error);
        }
    }
    
  }, [firestore, user, recordAttendance, toast]);
  
  useEffect(() => {
    let animationFrameId: number;

    const scan = async () => {
      // Only scan if camera is ready, user is logged in, and not currently processing a result
      if (hasCameraPermission && !isProcessing && videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
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

          if (code && code.data) {
            setIsProcessing(true); // Prevent further scanning
            const [qrId, qrToken] = code.data.split('|');

            if (qrId && qrToken) {
              await handleSuccessfulScan(qrId, qrToken);
            } else {
                setScanResult({data: 'فشل التحقق', message: 'تنسيق بيانات الكود غير صحيح.'});
            }
             // Allow scanning again after a delay
            setTimeout(() => {
                setIsProcessing(false);
                setScanResult(null);
            }, 5000); // Reset after 5 seconds to allow for another scan
          }
        }
      }
      // Continue scanning if not processing
      if (!isProcessing) {
        animationFrameId = requestAnimationFrame(scan);
      }
    };
    
    // Start scanning when camera is ready
    if(hasCameraPermission && !isProcessing){
        animationFrameId = requestAnimationFrame(scan);
    }

    return () => {
      if(animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [hasCameraPermission, isProcessing, handleSuccessfulScan]);
  
  if(isUserLoading) {
      return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
  }

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
          {hasCameraPermission && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
               <div className="w-48 h-48 sm:w-64 sm:h-64 border-4 border-dashed border-primary/70 rounded-lg animate-pulse"></div>
            </div>
          )}
           {hasCameraPermission === null && (
             <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
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
