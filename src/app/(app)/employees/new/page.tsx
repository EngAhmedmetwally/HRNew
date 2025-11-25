'use client';

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
import { Save, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
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
  password: z.string().min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
  jobTitle: z.string().min(1, { message: 'المنصب الوظيفي مطلوب' }),
  contractType: z.enum(['full-time', 'part-time'], { required_error: 'نوع العقد مطلوب' }),
  hireDate: z.string().min(1, { message: 'تاريخ التعيين مطلوب' }),
  baseSalary: z.coerce.number().min(0, { message: 'الراتب يجب أن يكون رقماً موجباً' }),
  status: z.enum(['active', 'inactive', 'on_leave'], { required_error: 'الحالة مطلوبة' }),
  role: z.enum(['employee', 'hr', 'admin'], { required_error: 'الصلاحية مطلوبة' }),
  deviceVerificationEnabled: z.boolean().default(false),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export default function NewEmployeePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { auth, firestore } = useFirebase();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: '',
      employeeId: '',
      password: '',
      jobTitle: '',
      contractType: 'full-time',
      hireDate: new Date().toISOString().split('T')[0], // Default to today
      baseSalary: 0,
      status: 'active',
      role: 'employee',
      deviceVerificationEnabled: false,
    },
  });

  async function onSubmit(data: EmployeeFormValues) {
    if (!auth || !firestore) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم تهيئة خدمات Firebase.' });
      return;
    }

    try {
      // 1. Generate a dummy email and use the provided password
      const email = `${data.employeeId}@hr-pulse.system`; // A unique, internal-only email
      const { password, role, ...employeeData } = data;

      // 2. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 3. Prepare employee data for Firestore
      const employeeDoc = {
        ...employeeData,
        id: user.uid, // Use the UID from Auth as the document ID
        email: email, // Store the email for future logins
        department: '', // Set department to empty string as it's removed
      };

      // 4. Save employee data to Firestore
      const employeeDocRef = doc(firestore, 'employees', user.uid);
      await setDoc(employeeDocRef, employeeDoc);

      // 5. Set user role if not 'employee'
      if (role === 'hr') {
        const hrRoleRef = doc(firestore, 'roles_hr', user.uid);
        await setDoc(hrRoleRef, { uid: user.uid });
      } else if (role === 'admin') {
        const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
        await setDoc(adminRoleRef, { uid: user.uid });
      }


      toast({
        title: 'تمت إضافة الموظف بنجاح',
        description: `تم إنشاء حساب للموظف ${data.name}.`,
      });
      router.push('/employees'); // Redirect to employees list on success
    } catch (error: any) {
      console.error("Error creating employee:", error);
      let description = "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.";
      if (error.code === 'auth/email-already-in-use') {
        description = "رقم الموظف هذا مستخدم بالفعل.";
      }
      toast({
        variant: 'destructive',
        title: 'فشل إنشاء الموظف',
        description: description,
      });
    }
  }

  return (
    <>
       <div className="flex items-center justify-between mb-6">
        <div className='flex items-center gap-2 md:gap-4'>
            <Button asChild variant="outline" size="icon">
                <Link href="/employees">
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </Button>
            <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">إضافة موظف جديد</h2>
            <p className="text-muted-foreground text-sm md:text-base">
                قم بملء النموذج أدناه لإنشاء حساب موظف جديد.
            </p>
            </div>
        </div>
       </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>المعلومات الأساسية والوظيفية</CardTitle>
              <CardDescription>
                تفاصيل الحساب الأساسية والبيانات الوظيفية للموظف.
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
                    <FormLabel>اسم المستخدم (رقم الموظف)</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: E006" {...field} />
                    </FormControl>
                     <FormDescription>
                        معرف فريد للموظف داخل الشركة. سيتم استخدامه لتسجيل الدخول.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
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
                      <Input placeholder="مثال: مدير مبيعات" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contractType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>نوع العقد</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex items-center gap-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="full-time" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            دوام كامل
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="part-time" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            دوام جزئي
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ التعيين</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                        defaultValue={field.value}
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
                <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>الصلاحية</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              <Save className="ml-2 h-4 w-4" />
              حفظ الموظف
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}

    