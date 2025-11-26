'use client';

import { Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useUser, errorEmitter, FirestorePermissionError } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs, doc, updateDoc, getDoc, limit } from 'firebase/firestore';
import type { Employee } from '@/lib/types';
import { AuthBackground } from "@/components/auth/auth-background";
import { FingerprintIcon } from "@/components/auth/fingerprint-icon";


// Function to generate a simple device fingerprint
const getDeviceFingerprint = () => {
    const navigator = window.navigator;
    const screen = window.screen;
    let fingerprint = navigator.userAgent;
    fingerprint += `|${screen.height}x${screen.width}`;
    fingerprint += `|${navigator.language}`;
    fingerprint += `|${new Date().getTimezoneOffset()}`;
    return fingerprint;
};


export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  const { user, permissions, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && user) {
        if (permissions.isAdmin || permissions.screens.length > 0) {
          router.replace('/dashboard');
        } else {
          router.replace('/scan');
        }
    }
  }, [user, isUserLoading, permissions, router]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    if (!auth || !firestore) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "خدمة المصادقة غير متاحة.",
      });
      setIsLoading(false);
      return;
    }
    
    const formData = new FormData(event.target as HTMLFormElement);
    const employeeIdInput = formData.get("employeeId") as string;
    const password = formData.get("password") as string;
    const email = `${employeeIdInput}@hr-pulse.system`;
    
    // Hardcoded super admin check
    if (employeeIdInput === 'admin' && password === '123456') {
      try {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
                try {
                    await createUserWithEmailAndPassword(auth, email, password);
                    await signInWithEmailAndPassword(auth, email, password);
                } catch (creationError: any) {
                    if (creationError.code === 'auth/email-already-in-use') {
                         toast({ variant: "destructive", title: "فشل دخول المدير", description: "كلمة مرور المدير غير صحيحة." });
                    } else {
                         throw creationError;
                    }
                    setIsLoading(false);
                    return;
                }
            } else {
                throw error;
            }
        }
        toast({ title: "تم تسجيل الدخول كمدير للنظام" });
      } catch (error: any) {
        console.error("Admin login/creation failed:", error);
        toast({ variant: "destructive", title: "فشل دخول المدير", description: "لم نتمكن من تسجيل دخول أو إنشاء حساب المدير." });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // --- Database-first authentication for regular employees ---
    try {
        const employeesRef = collection(firestore, 'employees');
        const q = query(employeesRef, where('employeeId', '==', employeeIdInput), limit(1));
        
        const querySnapshot = await getDocs(q).catch(error => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: employeesRef.path,
            operation: 'list',
          }));
          throw new Error("فشل البحث عن الموظف بسبب الأذونات.");
        });

        if (querySnapshot.empty) {
            toast({ variant: "destructive", title: "فشل تسجيل الدخول", description: "اسم المستخدم أو كلمة المرور غير صحيحة." });
            setIsLoading(false);
            return;
        }

        const employeeDoc = querySnapshot.docs[0];
        const employeeData = employeeDoc.data() as Employee;

        if (employeeData.password !== password) {
            toast({ variant: "destructive", title: "فشل تسجيل الدخول", description: "اسم المستخدم أو كلمة المرور غير صحيحة." });
            setIsLoading(false);
            return;
        }
        
        try {
             await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
             if (error.code === 'auth/user-not-found') {
                // User exists in DB but not in Auth, so create and sign in
                try {
                    await createUserWithEmailAndPassword(auth, email, password);
                    await signInWithEmailAndPassword(auth, email, password);
                } catch (creationError: any) {
                     if (creationError.code === 'auth/email-already-in-use') {
                        // This is an inconsistent state, but we can try signing in again as a fallback.
                        // It implies the user exists in Auth but the initial signIn failed.
                        await signInWithEmailAndPassword(auth, email, password);
                     } else {
                        throw creationError; // Other creation error
                     }
                }
             } else if (error.code === 'auth/invalid-credential') {
                // This means the user exists in Auth, but the password in the form
                // does not match the password in Auth. This can happen if the DB password
                // is out of sync with the Auth password.
                // We trust the DB password check we already did.
                toast({ variant: "destructive", title: "فشل تسجيل الدخول", description: "كلمة المرور غير متطابقة بين قاعدة البيانات والمصادقة. يرجى مراجعة المدير." });
                setIsLoading(false);
                return;
             } else {
                throw error; // Other sign-in error
             }
        }
        
        // After successful login, check for device verification
        const deviceFingerprint = getDeviceFingerprint();
        if (employeeData.deviceVerificationEnabled) {
            if (!employeeData.deviceId) {
                // First login, register device ID
                await updateDoc(employeeDoc.ref, { deviceId: deviceFingerprint });
            } else if (employeeData.deviceId !== deviceFingerprint) {
                await auth.signOut(); // Sign out user
                toast({ variant: "destructive", title: "فشل التحقق من الجهاز", description: "هذا الجهاز غير مصرح له بتسجيل الدخول لهذا الحساب." });
                setIsLoading(false);
                return;
            }
        }
        
        toast({
            title: "تم تسجيل الدخول بنجاح",
            description: "جاري توجيهك...",
        });

        router.refresh();

    } catch (error: any) {
      console.error("Login Error:", error);
       toast({
         variant: "destructive",
         title: "فشل تسجيل الدخول",
         description: error.message || "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
       });
    } finally {
      setIsLoading(false);
    }
  };
  
   if (isUserLoading) { 
        return (
             <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background text-foreground">
                <div className="absolute inset-0 bg-background" />
                <div className="z-10 flex flex-col items-center text-center">
                    <FingerprintIcon className="h-20 w-20 mb-4 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">HighClass HR</h1>
                    <p className="text-muted-foreground mt-2">
                        جاري المصادقة وتجهيز لوحة التحكم الخاصة بك...
                    </p>
                </div>
            </div>
        )
   }


  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background p-4">
       <div className="absolute inset-0 bg-background" />

        <div className="z-10 w-full max-w-sm">
            <div className="flex flex-col items-center text-center mb-6">
                 <FingerprintIcon className="h-16 w-16 mb-4" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">HighClass HR</h1>
                <p className="text-muted-foreground mt-2">نظام ذكي للحضور والانصراف والرواتب</p>
            </div>

          <Card className="z-10 w-full bg-card/50 backdrop-blur-sm">
             <form onSubmit={handleLogin}>
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
                    <CardDescription>
                    أدخل اسم المستخدم وكلمة المرور للوصول إلى حسابك
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                    <Label htmlFor="employeeId">اسم المستخدم</Label>
                    <Input id="employeeId" name="employeeId" type="text" placeholder="E001" required />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="password">كلمة المرور</Label>
                    <Input id="password" name="password" type="password" required />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" type="submit" disabled={isLoading}>
                        {isLoading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
                    </Button>
                </CardFooter>
            </form>
          </Card>
            <p className="z-10 mt-4 text-center text-sm text-muted-foreground">
                هل نسيت كلمة المرور؟{' '}
                <Link
                    href="#"
                    className="underline underline-offset-4 hover:text-primary"
                >
                    إعادة تعيين
                </Link>
            </p>
        </div>
    </div>
  );
}
