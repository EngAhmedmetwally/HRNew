'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Save, ArrowRight, RotateCw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, notFound, useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { useDoc, useFirebase, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import type { Employee } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const employeeFormSchema = z.object({
  name: z.string().min(1, { message: 'الاسم مطلوب' }),
  employeeId: z.string().min(1, { message: 'رقم الموظف مطلوب' }),
  jobTitle: z.string().min(1, { message: 'المنصب الوظيفي مطلوب' }),
  baseSalary: z.coerce.number().min(0, { message: 'الراتب يجب أن يكون رقماً موجباً' }),
  status: z.enum(['active', 'inactive', 'on_leave'], { required_error: 'الحالة مطلوبة' }),
  role: z.enum(['employee', 'hr', 'admin'], { required_error: 'الصلاحية مطلوبة' }),
  deviceVerificationEnabled: z.boolean().default(false),
  deviceId: z.string().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export default function EditEmployeePage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;
  
  const { firestore } = useFirebase();

  const employeeDocRef = useMemoFirebase(() => {
    if (!firestore || !employeeId) return null;
    return doc(firestore, 'employees', employeeId);
  }, [firestore, employeeId]);
  
  const { data: employee, isLoading, error } = useDoc<Employee>(employeeDocRef);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: '',
      employeeId: '',
      jobTitle: '',
      baseSalary: 0,
      status: 'active',
      role: 'employee',
      deviceVerificationEnabled: false,
      deviceId: '',
    },
  });

  useEffect(() => {
    if (employee) {
      const fetchRole = async () => {
        let role = 'employee';
        if (firestore) {
          const adminRoleRef = doc(firestore, 'roles_admin', employee.id);
          const hrRoleRef = doc(firestore, 'roles_hr', employee.id);
          const [adminSnap, hrSnap] = await Promise.all([getDoc(adminRoleRef), getDoc(hrRoleRef)]);
          if (adminSnap.exists()) {
            role = 'admin';
          } else if (hrSnap.exists()) {
            role = 'hr';
          }
        }
        form.reset({
          name: employee.name,
          employeeId: employee.employeeId,
          jobTitle: employee.jobTitle,
          baseSalary: employee.baseSalary,
          status: employee.status,
          role: role as 'employee' | 'hr' | 'admin',
          deviceVerificationEnabled: employee.deviceVerificationEnabled ?? false,
          deviceId: employee.deviceId ?? '',
        });
      };
      fetchRole();
    }
  }, [employee, form, firestore]);

  const deviceVerificationEnabled = form.watch('deviceVerificationEnabled');

  async function onSubmit(data: EmployeeFormValues) {
    if (!employeeDocRef || !firestore) return;
    
    const { role, ...employeeData } = data;

    updateDocumentNonBlocking(employeeDocRef, employeeData);

    // Securely update roles
    const adminRoleRef = doc(firestore, 'roles_admin', employeeId);
    const hrRoleRef = doc(firestore, 'roles_hr', employeeId);

    const operations = [];
    
    // Always remove from both first to handle demotions
    operations.push(deleteDoc(adminRoleRef));
    operations.push(deleteDoc(hrRoleRef));
    
    await Promise.all(operations);
    
    // Then add to the correct role collection if not 'employee'
    if (role === 'admin') {
      await setDoc(adminRoleRef, { uid: employeeId });
    } else if (role === 'hr') {
      await setDoc(hrRoleRef, { uid: employeeId });
    }

    toast({
      title: 'تم تحديث بيانات الموظف بنجاح',
      description: `تم تحديث حساب الموظف ${data.name}.`,
    });
    router.push('/employees');
  }
  
  function handleResetDeviceId() {
    form.setValue('deviceId', '');
    toast({
        title: 'تم مسح معرّف الجهاز',
        description: 'سيتم تسجيل معرّف الجهاز الجديد عند تسجيل الدخول التالي.',
    });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!employee && !isLoading) {
    notFound();
    return null;
  }

  return (
    <>
       <div className="flex items-center justify-between mb-6">
        <div className='flex items-center gap-4'>
            <Button asChild variant="outline" size="icon">
                <Link href="/employees">
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </Button>
            <div>
            <h2 className="text-2xl font-bold tracking-tight">تعديل بيانات الموظف</h2>
            <p className="text-muted-foreground">
                قم بتحديث النموذج أدناه لتعديل حساب الموظف.
            </p>
            </div>
        </div>
       </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>المعلومات الأساسية</CardTitle>
              <CardDescription>
                تفاصيل الحساب الأساسية للموظف.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم الكامل</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: أحمد علي" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الموظف</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: E001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المنصب الوظيفي</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: مهندس برمجيات" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="baseSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الراتب الأساسي (EGP)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="مثال: 5000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>حالة الحساب</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex items-center gap-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="active" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            نشط
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="on_leave" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            في إجازة
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="inactive" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            غير نشط
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>الصلاحيات والأمان</CardTitle>
                <CardDescription>
                    إدارة صلاحيات الوصول وإعدادات الأمان الخاصة بالموظف.
                </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
                 <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>الصلاحية</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="اختر صلاحية للموظف" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="employee">موظف</SelectItem>
                            <SelectItem value="hr">مسؤول موارد بشرية</SelectItem>
                            <SelectItem value="admin">مدير نظام</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                control={form.control}
                name="deviceVerificationEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        تفعيل التحقق من الجهاز
                      </FormLabel>
                      <FormDescription>
                        هل يتطلب من الموظف تسجيل الدخول من جهاز معين؟
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {deviceVerificationEnabled && (
                <FormField
                    control={form.control}
                    name="deviceId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>معرف الجهاز المسجل</FormLabel>
                        <div className="flex gap-2">
                        <FormControl>
                            <Input {...field} readOnly placeholder="لم يتم تسجيل أي جهاز بعد" />
                        </FormControl>
                        <Button type="button" variant="secondary" onClick={handleResetDeviceId} disabled={!field.value}>
                            <RotateCw className="ml-2 h-4 w-4" />
                            إعادة تعيين
                        </Button>
                        </div>
                        <FormDescription>
                         يتم تسجيل الجهاز تلقائياً عند أول عملية تسجيل دخول ناجحة بعد تفعيل الميزة أو إعادة تعيينها.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              <Save className="ml-2 h-4 w-4" />
              حفظ التعديلات
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
