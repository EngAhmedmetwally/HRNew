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
import { useFirebase, useUser } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from "firebase/auth";
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import type { Employee } from '@/lib/types';
import { AuthBackground } from "@/components/auth/auth-background";
import { FingerprintIcon } from "@/components/auth/fingerprint-icon";


export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  const { user, roles, isUserLoading } = useUser();

   useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        if (roles.isAdmin || roles.isHr) {
          router.replace('/dashboard');
        } else {
          router.replace('/scan');
        }
      }
    }
  }, [user, roles, isUserLoading, router]);

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
    const employeeId = formData.get("employeeId") as string;
    const password = formData.get("password") as string;

    try {
        // Special case for the super-admin
        if (employeeId === 'admin' && password === '123456') {
            const adminEmail = 'admin@hr-pulse.system';
            try {
                await signInWithEmailAndPassword(auth, adminEmail, password);
            } catch (error: any) {
                if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                    await createUserWithEmailAndPassword(auth, adminEmail, password);
                } else {
                    throw error;
                }
            }
        } else {
            // Standard employee login using Firestore for credentials
            const q = query(collection(firestore, "employees"), where("employeeId", "==", employeeId));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error("auth/user-not-found");
            }
            
            const employeeDoc = querySnapshot.docs[0];
            const employeeData = employeeDoc.data() as Employee;
            
            if (employeeData.password !== password) {
                throw new Error("auth/wrong-password");
            }
            
            // If password matches, sign out any existing user, then sign in anonymously
            if (auth.currentUser) {
              await auth.signOut();
            }
            const userCredential = await signInAnonymously(auth);
            const anonymousUid = userCredential.user.uid;

            // Associate the new anonymous UID with the employee document ID
            // This allows rules to check `request.auth.uid == resource.data.id`
            const employeeRef = employeeDoc.ref;
            await updateDoc(employeeRef, { id: anonymousUid });
        }

        toast({
            title: "تم تسجيل الدخول بنجاح",
            description: "جاري توجيهك...",
        });
        
        router.replace('/splash');

    } catch (error: any) {
      console.error("Login Error:", error);
      let description = "فشل تسجيل الدخول. يرجى التحقق من البيانات والمحاولة مرة أخرى.";
      if (error.message === 'auth/user-not-found' || error.message === 'auth/wrong-password') {
        description = "اسم المستخدم أو كلمة المرور غير صحيحة.";
      } else if (error.code === 'auth/invalid-credential') {
        description = "بيانات اعتماد المدير غير صالحة.";
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
  
   if (isUserLoading || (user && !user.isAnonymous)) { // Also show splash if a non-anonymous user is detected
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
