'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, Trash2, ArrowRight } from 'lucide-react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import Link from 'next/link';


export default function DatabaseManagementPage() {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user, roles, isUserLoading } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const canView = roles.isAdmin;
  
  const handleDeleteOldQrCodes = async () => {
    if (!firestore) return;

    setIsDeleting(true);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = Timestamp.fromDate(today);

      const qrCodesRef = collection(firestore, 'qrCodes');
      const q = query(qrCodesRef, where('date', '<', todayTimestamp));
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          title: 'لا توجد بيانات للحذف',
          description: 'جميع أكواد QR الموجودة صالحة لليوم الحالي.',
        });
        setIsDeleting(false);
        return;
      }

      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      toast({
        title: 'تم الحذف بنجاح',
        description: `تم حذف ${querySnapshot.size} من أكواد QR القديمة.`,
        className: 'bg-green-500 text-white',
      });

    } catch (error) {
      console.error("Error deleting old QR codes: ", error);
      toast({
        variant: "destructive",
        title: 'فشل الحذف',
        description: 'حدث خطأ أثناء حذف البيانات. يرجى المحاولة مرة أخرى.',
      });
    } finally {
      setIsDeleting(false);
    }
  };


  if (isUserLoading) {
    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  if (!canView) {
      return (
          <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>وصول مرفوض</AlertTitle>
              <AlertDescription>
                  ليس لديك الصلاحية لعرض هذه الصفحة.
              </AlertDescription>
          </Alert>
      );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                 <Button asChild variant="outline" size="icon">
                    <Link href="/settings">
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">إدارة قاعدة البيانات</h2>
                    <p className="text-muted-foreground">
                    تنفيذ عمليات الصيانة والتنظيف على قاعدة البيانات.
                    </p>
                </div>
            </div>
       </div>

      <Card>
        <CardHeader>
          <CardTitle>تنظيف البيانات</CardTitle>
          <CardDescription>
            إجراءات لحذف البيانات القديمة أو غير الضرورية لتحسين الأداء.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                    <h3 className="font-semibold">حذف أكواد QR القديمة</h3>
                    <p className="text-sm text-muted-foreground">
                        حذف جميع أكواد QR التي تم إنشاؤها في الأيام السابقة.
                    </p>
                </div>
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting}>
                      {isDeleting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Trash2 className="ml-2 h-4 w-4" />}
                      بدء الحذف
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                      <AlertDialogDescription>
                        هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع أكواد QR التي تخص الأيام السابقة بشكل دائم.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteOldQrCodes} className="bg-destructive hover:bg-destructive/90">
                        نعم، قم بالحذف
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
