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
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Save, ArrowRight, RotateCw } from 'lucide-react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { employees } from '@/lib/data'; // Assuming you have a way to fetch a single employee
import { Switch } from '@/components/ui/switch';


const screens = [
  { id: 'dashboard', label: 'لوحة التحكم' },
  { id: 'employees', label: 'الموظفين' },
  { id: 'attendance', label: 'الحضور والإنصراف' },
  { id: 'scan', label: 'مسح QR' },
  { id: 'payroll', label: 'الرواتب' },
  { id: 'settings', label: 'الإعدادات' },
] as const;

const employeeFormSchema = z.object({
  name: z.string().min(1, { message: 'الاسم مطلوب' }),
  username: z.string().min(1, { message: 'اسم المستخدم مطلوب' }),
  password: z.string().optional(), // Password is not required on edit
  status: z.enum(['active', 'inactive'], { required_error: 'الحالة مطلوبة' }),
  salary: z.coerce.number().min(0, { message: 'الراتب يجب أن يكون رقماً موجباً' }),
  attendanceType: z.enum(['general', 'custom'], { required_error: 'الرجاء اختيار نوع وقت الحضور' }),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  permissions: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'يجب أن تختار صلاحية واحدة على الأقل.',
  }),
  deviceVerificationEnabled: z.boolean().default(false),
  deviceId: z.string().optional(),
}).refine(data => {
    if (data.attendanceType === 'custom') {
        return !!data.checkInTime && !!data.checkOutTime;
    }
    return true;
}, {
    message: "أوقات الحضور والانصراف المخصصة مطلوبة",
    path: ["checkInTime"],
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export default function EditEmployeePage() {
  const { toast } = useToast();
  const params = useParams();
  const employeeId = params.id as string;
  const employee = employees.find(e => e.id === employeeId);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    // Populate form with employee data
    defaultValues: {
      name: '',
      username: '',
      password: '',
      status: 'active',
      salary: 0,
      attendanceType: 'general',
      permissions: [],
      checkInTime: '',
      checkOutTime: '',
      deviceVerificationEnabled: false,
      deviceId: '',
    },
  });

  useEffect(() => {
    if (employee) {
      // For simplicity, we are not loading all fields. In a real app, you would.
      form.reset({
        name: employee.name,
        username: employee.id.toLowerCase(), // Simulate username
        status: employee.status === 'on_leave' ? 'active' : employee.status, // Map 'on_leave'
        salary: 5000, // Placeholder
        attendanceType: 'general',
        permissions: ['dashboard', 'attendance'], // Placeholder
        deviceVerificationEnabled: true, // Placeholder to show the new UI
        deviceId: 'device-id-12345-abcde-placeholder', // Placeholder
      });
    }
  }, [employee, form]);

  const attendanceType = form.watch('attendanceType');
  const deviceVerificationEnabled = form.watch('deviceVerificationEnabled');

  function onSubmit(data: EmployeeFormValues) {
    // In a real app, you would update this data in your database
    console.log({ ...data, id: employeeId });
    toast({
      title: 'تم تحديث بيانات الموظف بنجاح',
      description: `تم تحديث حساب الموظف ${data.name}.`,
    });
  }
  
  function handleResetDeviceId() {
    form.setValue('deviceId', '');
    toast({
        title: 'تم مسح معرّف الجهاز',
        description: 'سيتم تسجيل معرّف الجهاز الجديد عند تسجيل الدخول التالي.',
    });
  }

  if (!employee) {
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
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المستخدم</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: ahmad.ali" {...field} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة السر الجديدة</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} placeholder="اتركه فارغاً لعدم التغيير" />
                    </FormControl>
                    <FormDescription>
                        اتركه فارغاً إذا كنت لا تريد تغيير كلمة السر.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الراتب (EGP)</FormLabel>
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
                            مفعل
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="inactive" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            غير مفعل
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
                <CardTitle>إعدادات الأمان</CardTitle>
                <CardDescription>
                    إدارة إعدادات الأمان الخاصة بالموظف.
                </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
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

          <Card>
             <CardHeader>
                <CardTitle>صلاحيات الوصول</CardTitle>
                <CardDescription>
                    اختر الشاشات التي يمكن للموظف الوصول إليها.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <FormField
                    control={form.control}
                    name="permissions"
                    render={() => (
                    <FormItem>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {screens.map((item) => (
                            <FormField
                            key={item.id}
                            control={form.control}
                            name="permissions"
                            render={({ field }) => {
                                return (
                                <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                                >
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                        return checked
                                            ? field.onChange([...field.value, item.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                (value) => value !== item.id
                                                )
                                            );
                                        }}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    {item.label}
                                    </FormLabel>
                                </FormItem>
                                );
                            }}
                            />
                        ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الحضور والانصراف</CardTitle>
              <CardDescription>
                اختر ما إذا كان الموظف سيتبع التوقيت العام أم سيتم تحديد وقت مخصص له.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField
                    control={form.control}
                    name="attendanceType"
                    render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormControl>
                        <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex items-center gap-4"
                        >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                                <RadioGroupItem value="general" />
                            </FormControl>
                            <FormLabel className="font-normal">
                                استخدام التوقيت العام
                            </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                                <RadioGroupItem value="custom" />
                            </FormControl>
                            <FormLabel className="font-normal">
                                تحديد توقيت مخصص
                            </FormLabel>
                            </FormItem>
                        </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                {attendanceType === 'custom' && (
                    <div className="grid gap-6 md:grid-cols-2 p-4 border rounded-md">
                        <FormField
                            control={form.control}
                            name="checkInTime"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>وقت الحضور المخصص</FormLabel>
                                <FormControl>
                                <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="checkOutTime"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>وقت الانصراف المخصص</FormLabel>
                                <FormControl>
                                <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit">
              <Save className="ml-2 h-4 w-4" />
              حفظ التعديلات
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
    