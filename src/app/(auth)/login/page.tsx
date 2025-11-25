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
import { FingerprintAnimation } from "@/components/auth/fingerprint-animation";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useFirestore } from "@/firebase/provider";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Employee } from '@/lib/types';


export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore } = useFirebase(); // Get the auth instance

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

    if (employeeId === 'admin' && password === '123456') {
       // Simulate Super Admin Login
        toast({
            title: "تم تسجيل الدخول بنجاح",
            description: "مرحبًا بك أيها المشرف الخارق!",
        });
        router.push('/splash');
        return;
    }

    try {
        // 1. Find the employee by employeeId
        const q = query(collection(firestore, "employees"), where("employeeId", "==", employeeId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error("auth/user-not-found");
        }

        // 2. Get the user's email from the doc
        const employeeDoc = querySnapshot.docs[0];
        const employeeData = employeeDoc.data() as Employee;
        const email = (employeeData as any).email; // The email is stored in the doc

        if (!email) {
            throw new Error("auth/invalid-credential");
        }
        
      // 3. Sign in with the retrieved email and provided password
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged in the provider will handle the user state.
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحبًا بك مرة أخرى!",
      });
      router.push('/splash');
    } catch (error: any) {
      console.error("Login Error:", error);
      let description = "فشل تسجيل الدخول. يرجى التحقق من رقم الموظف وكلمة المرور.";
      if (error.message === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = "رقم الموظف أو كلمة المرور غير صحيحة.";
      }
      toast({
        variant: "destructive",
        title: "فشل تسجيل الدخول",
        description: description,
      });
      setIsLoading(false);
    } 
    // No finally block to set isLoading to false, because the splash screen handles the visual loading state.
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background">
       <div className="absolute inset-0 z-0">
         <FingerprintAnimation />
       </div>

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
