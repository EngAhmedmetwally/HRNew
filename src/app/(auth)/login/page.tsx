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
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import type { Employee } from '@/lib/types';
import { AuthBackground } from "@/components/auth/auth-background";


export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  const { user, roles, isUserLoading } = useUser();

   useEffect(() => {
    if (!isUserLoading && user) {
        if (roles.isAdmin || roles.isHr) {
            router.replace('/dashboard');
        } else {
            router.replace('/scan');
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
        if (employeeId === 'admin' && password === '123456') {
            const adminEmail = 'admin@hr-pulse.system';
            try {
                // Try to sign in first
                await signInWithEmailAndPassword(auth, adminEmail, password);

            } catch (error: any) {
                 // If user does not exist, create it
                if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                    await createUserWithEmailAndPassword(auth, adminEmail, password);
                    // The onAuthStateChanged listener in the provider will handle role setting
                } else {
                    // Re-throw other errors
                    throw error;
                }
            }
            
            toast({
              title: "تم تسجيل الدخول بنجاح",
              description: "مرحبًا بك مرة أخرى أيها المدير!",
            });
            // The useEffect hook will handle redirection to /dashboard
            router.replace('/dashboard');

        } else {
            const q = query(collection(firestore, "employees"), where("employeeId", "==", employeeId));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error("auth/user-not-found");
            }
            
            const employeeDoc = querySnapshot.docs[0];
            const employeeData = employeeDoc.data() as Employee;
            const email = (employeeData as any).email; 

            if (!email) {
                throw new Error("auth/invalid-credential");
            }
            await signInWithEmailAndPassword(auth, email, password);
             toast({
                title: "تم تسجيل الدخول بنجاح",
                description: "مرحبًا بك مرة أخرى!",
             });
             // The useEffect will handle the redirect for regular users
        }
    } catch (error: any) {
      console.error("Login Error:", error);
      let description = "فشل تسجيل الدخول. يرجى التحقق من رقم الموظف وكلمة المرور.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.message === 'auth/user-not-found') {
        description = "رقم الموظف أو كلمة المرور غير صحيحة.";
      }
       if (error.code === 'auth/invalid-email') {
        description = "حساب المدير الخارق غير موجود. يرجى التأكد من تشغيل الإعداد الأولي.";
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
  
   // Show a loading state while checking for an existing session
   if (isUserLoading || user) {
        return (
             <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background">
                <AuthBackground />
                <div className="absolute top-8 flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Building className="h-6 w-6" />
                    <span>HR Pulse</span>
                </div>
                <p>جاري التحقق من جلسة الدخول...</p>
            </div>
        )
   }


  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background">
       <AuthBackground />

       <div className="absolute top-8 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Building className="h-6 w-6" />
            <span>HR Pulse</span>
        </div>

      <Card className="z-10 w-full max-w-sm bg-background/80 backdrop-blur-sm">
         <form onSubmit={handleLogin}>
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
                <CardDescription>
                أدخل رقم الموظف وكلمة المرور للوصول إلى حسابك
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="employeeId">رقم الموظف</Label>
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
  );
}
