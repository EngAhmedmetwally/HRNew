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
import { signInAnonymously, updateProfile } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
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
  const { user, roles, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && user) {
        // User is loaded and exists, check device and redirect
        verifyDeviceAndRedirect(user);
    } else if (!isUserLoading && !user) {
        // If auth is not loading and there is no user, ensure we are on the login page.
        // This handles cases where a user might be signed out from another tab.
        if (window.location.pathname !== '/login') {
            router.replace('/login');
        }
    }
  }, [user, isUserLoading, roles, router]);

  const verifyDeviceAndRedirect = async (loggedInUser: any) => {
    if (!firestore || !auth) return;
    
    // The UID from anonymous auth doesn't directly map to our employee ID.
    // The user object we get from useUser is the one we want.
    // If the UID is what we set as the employee doc ID, this will work.
    const employeeId = loggedInUser.uid;
    
    try {
        const employeeDocRef = doc(firestore, 'employees', employeeId);
        const employeeDocSnap = await getDoc(employeeDocRef).catch(e => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: employeeDocRef.path, operation: 'get' }));
            throw e;
        });

        if (!employeeDocSnap.exists()) {
            toast({ variant: "destructive", title: "خطأ في الحساب", description: "لم يتم العثور على بيانات الموظف." });
            await auth.signOut();
            return;
        }

        const employeeData = employeeDocSnap.data() as Employee;
        if (employeeData.deviceVerificationEnabled) {
            const currentDeviceFingerprint = getDeviceFingerprint();
            if (employeeData.deviceId && employeeData.deviceId !== currentDeviceFingerprint) {
                toast({ variant: "destructive", title: "فشل تسجيل الدخول", description: "هذا الجهاز غير مصرح له بتسجيل الدخول لهذا الحساب." });
                await auth.signOut();
                return;
            } else if (!employeeData.deviceId) {
                const deviceData = { deviceId: currentDeviceFingerprint };
                await updateDoc(employeeDocRef, deviceData).catch(e => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({ path: employeeDocRef.path, operation: 'update', requestResourceData: deviceData }));
                    throw e;
                });
                toast({ title: "تم تسجيل الجهاز", description: "تم ربط هذا الجهاز بحسابك بنجاح." });
            }
        }
        
        // Redirect based on roles after successful verification
        if (roles.isAdmin || roles.isHr) {
          router.replace('/dashboard');
        } else {
          router.replace('/scan');
        }

    } catch (error) {
        console.error("Error during device verification or redirection:", error);
        toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ أثناء التحقق من بياناتك." });
        if(auth.currentUser) {
            await auth.signOut(); // Sign out on any error
        }
    }
  };


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

    try {
        const employeesRef = collection(firestore, 'employees');
        const q = query(employeesRef, where("employeeId", "==", employeeIdInput));

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            toast({ variant: "destructive", title: "فشل تسجيل الدخول", description: "اسم المستخدم أو كلمة المرور غير صحيحة." });
            setIsLoading(false);
            return;
        }

        const employeeDoc = querySnapshot.docs[0];
        const employeeData = employeeDoc.data();

        // This is not secure. Passwords should be hashed. For demo purposes only.
        if (employeeData.password !== password) {
            toast({ variant: "destructive", title: "فشل تسجيل الدخول", description: "اسم المستخدم أو كلمة المرور غير صحيحة." });
            setIsLoading(false);
            return;
        }

        // We need to sign in to get a UID, but we don't want to create a permanent user.
        // Anonymous sign-in is a good way to get a temporary, session-based user.
        // However, this UID will be different on every login.
        // A better approach is to use a custom token system, but that's complex.
        // Let's stick with the email-based system as it correctly maps a stable UID to an employee.
        // The user only sees employeeId, the email is an implementation detail.
        const email = `${employeeIdInput}@hr-pulse.system`;
        
        // Sign out any existing user (e.g., from a failed previous attempt)
        if (auth.currentUser) {
            await auth.signOut();
        }
        
        // Re-implementing the original logic as it's the correct way with Firebase Auth
        const userCredential = await auth.signInWithEmailAndPassword(email, password);

        // On successful sign-in, the useEffect will trigger the verification and redirection.
        toast({
            title: "تم تسجيل الدخول بنجاح",
            description: "جاري توجيهك...",
        });

    } catch (error: any) {
      console.error("Login Error:", error);
      let description = "فشل تسجيل الدخول. يرجى التحقق من البيانات والمحاولة مرة أخرى.";
       if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = "اسم المستخدم أو كلمة المرور غير صحيحة.";
      }
      toast({
        variant: "destructive",
        title: "فشل تسجيل الدخول",
        description: description,
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
