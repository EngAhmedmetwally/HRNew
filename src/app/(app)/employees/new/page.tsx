'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Save, ArrowRight } from 'lucide-react';
import Link from 'next/link';

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
  password: z.string().min(6, { message: 'كلمة السر يجب أن تكون 6 أحرف على الأقل' }),
  status: z.enum(['active', 'inactive'], { required_error: 'الحالة مطلوبة' }),
  salary: z.coerce.number().min(0, { message: 'الراتب يجب أن يكون رقماً موجباً' }),
  attendanceType: z.enum(['general', 'custom'], { required_error: 'الرجاء اختيار نوع وقت الحضور' }),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  permissions: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'يجب أن تختار صلاحية واحدة على الأقل.',
  }),
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

export default function NewEmployeePage() {
  const { toast } = useToast();
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: '',
      username: '',
      password: '',
      status: 'active',
      salary: 0,
      attendanceType: 'general',
      permissions: [],
    },
  });

  const attendanceType = form.watch('attendanceType');

  function onSubmit(data: EmployeeFormValues) {
    // In a real app, you would save this data to your database
    console.log(data);
    toast({
      title: 'تمت إضافة الموظف بنجاح',
      description: `تم إنشاء حساب للموظف ${data.name}.`,
    });
    form.reset();
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
            <h2 className="text-2xl font-bold tracking-tight">إضافة موظف جديد</h2>
            <p className="text-muted-foreground">
                قم بملء النموذج أدناه لإنشاء حساب موظف جديد.
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
                      <Input placeholder="مثال: ahmad.ali" {...field} />
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
                    <FormLabel>كلمة السر</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الراتب (SAR)</FormLabel>
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
                            defaultValue={field.value}
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
              حفظ الموظف
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
