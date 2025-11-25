'use client';

import { Fingerprint, Building } from "lucide-react";
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

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      // In a real app, you'd validate credentials here.
      // For now, we'll just simulate success.
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحبًا بك مرة أخرى!",
      });

      // After successful login, redirect to the splash screen
      router.push('/splash');

    }, 2000);
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
                أدخل بياناتك للوصول إلى حسابك
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="username">اسم المستخدم</Label>
                <Input id="username" type="text" placeholder="username" required />
                </div>
                <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input id="password" type="password" required />
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
