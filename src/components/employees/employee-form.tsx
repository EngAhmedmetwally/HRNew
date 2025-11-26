'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
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
import { Save, Loader2, RotateCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useFirebase } from '@/firebase';
import { doc, setDoc, collection, query, where, getDocs, getDoc, deleteDoc } from 'firebase/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Employee } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';

// Unified schema for both create and edit
const employeeFormSchema = z.object({
  name: z.string().min(1, { message: 'الاسم مطلوب' }),
  employeeId: z.string().min(1, { message: 'رقم الموظف مطلوب' }),
  password: z.string().optional(),
  jobTitle: z.string().min(1, { message: 'المنصب الوظيفي مطلوب' }),
  contractType: z.enum(['full-time', 'part-time'], { required_error: 'نوع العقد مطلوب' }),
  customCheckInTime: z.string().optional(),
  customCheckOutTime: z.string().optional(),
  hireDate: z.string().min(1, { message: 'تاريخ التعيين مطلوب' }),
  baseSalary: z.coerce.number().min(0, { message: 'الراتب يجب أن يكون رقماً موجباً' }),
  status: z.enum(['active', 'inactive', 'on_leave'], { required_error: 'الحالة مطلوبة' }),
  role: z.enum(['employee', 'hr', 'admin'], { required_error: 'الصلاحية مطلوبة' }),
  deviceVerificationEnabled: z.boolean().default(false),
  deviceId: z.string().optional(),
}).refine(data => {
    // In create mode (when employee is null), password is required
    if (!data.password && !('id' in data)) { 
        return false;
    }
    if (data.password && data.password.length > 0 && data.password.length < 6) {
        return false;
    }
    return true;
}, {
    message: 'كلمة المرور مطلوبة ويجب أن تكون 6 أحرف على الأقل',
    path: ['password'],
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

interface EmployeeFormProps {
    employee?: Employee;
    onFinish: () => void;
}

const defaultFormValues: EmployeeFormValues = {
  name: '',
  employeeId: '',
  password: '',
  jobTitle: '',
  contractType: 'full-time',
  customCheckInTime: '',
  customCheckOutTime: '',
  hireDate: new Date().toISOString().split('T')[0],
  baseSalary: 0,
  status: 'active',
  role: 'employee',
  deviceVerificationEnabled: false,
  deviceId: '',
};

export function EmployeeForm({ employee, onFinish }: EmployeeFormProps) {
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  const isEditMode = !!employee;

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema.refine(data => {
        // For new employees, password is required
        if (!isEditMode && !data.password) return false;
        return true;
    }, { message: "كلمة المرور مطلوبة", path: ["password"]})),
    defaultValues: defaultFormValues,
  });
  
  useEffect(() => {
    async function setFormValues() {
        if (isEditMode && employee && firestore) {
             let role = 'employee';
             const adminRoleRef = doc(firestore, 'roles_admin', employee.id);
             const hrRoleRef = doc(firestore, 'roles_hr', employee.id);
             try {
                const [adminSnap, hrSnap] = await Promise.all([getDoc(adminRoleRef), getDoc(hrRoleRef)]);
                if (adminSnap.exists()) {
                    role = 'admin';
                } else if (hrSnap.exists()) {
                    role = 'hr';
                }
             } catch (e) {
                console.error("Could not fetch user roles", e);
             }

            form.reset({
                ...defaultFormValues,
                ...employee,
                password: '', // Clear password field for edit mode
                role: role as 'employee' | 'hr' | 'admin',
                customCheckInTime: employee.customCheckInTime || '',
                customCheckOutTime: employee.customCheckOutTime || '',
                deviceId: employee.deviceId || '',
            });
        } else {
          form.reset(defaultFormValues);
        }
    }
    setFormValues();
  }, [employee, isEditMode, form, firestore]);
  
  const deviceVerificationEnabled = form.watch('deviceVerificationEnabled');
  const contractType = form.watch('contractType');

  async function onSubmit(data: EmployeeFormValues) {
    if (!firestore) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم تهيئة خدمات Firebase.' });
        return;
    }

    if (isEditMode && employee) {
        // Update existing employee
        const employeeDocRef = doc(firestore, 'employees', employee.id);
        const { role, ...employeeData } = data;
        
        if (!employeeData.password) {
            delete (employeeData as Partial<typeof employeeData>).password; // Don't update password if it's empty
        }
        
        if (!employeeData.deviceId) {
           delete (employeeData as {deviceId?: string}).deviceId;
        }

        try {
            await setDoc(employeeDocRef, employeeData, { merge: true });

            // Handle roles
            const adminRoleRef = doc(firestore, 'roles_admin', employee.id);
            const hrRoleRef = doc(firestore, 'roles_hr', employee.id);
            await Promise.all([deleteDoc(adminRoleRef), deleteDoc(hrRoleRef)]);
            if (role === 'admin') {
                await setDoc(adminRoleRef, { uid: employee.id });
            } else if (role === 'hr') {
                await setDoc(hrRoleRef, { uid: employee.id });
            }

            toast({ title: 'تم تحديث بيانات الموظف بنجاح' });
            onFinish();
        } catch (error: any) {
            console.error("Error updating employee:", error);
            toast({ variant: "destructive", title: 'فشل تحديث البيانات', description: 'حدث خطأ أثناء التحديث.' });
        }
    } else {
        // Create new employee
        const employeesRef = collection(firestore, 'employees');
        const q = query(employeesRef, where("employeeId", "==", data.employeeId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            form.setError('employeeId', { message: 'رقم الموظف هذا مستخدم بالفعل.' });
            return;
        }

        const { role, ...employeeData } = data;
        const newEmployeeId = doc(employeesRef).id; // Generate a new unique ID

        try {
            const employeeDoc = {
                ...employeeData,
                id: newEmployeeId,
            };
            await setDoc(doc(firestore, 'employees', newEmployeeId), employeeDoc);

            if (role === 'admin') {
                await setDoc(doc(firestore, 'roles_admin', newEmployeeId), { uid: newEmployeeId });
            } else if (role === 'hr') {
                await setDoc(doc(firestore, 'roles_hr', newEmployeeId), { uid: newEmployeeId });
            }
            
            toast({ title: 'تمت إضافة الموظف بنجاح', description: `تم إنشاء حساب للموظف ${data.name}.` });
            onFinish();
        } catch (error: any) {
            console.error("Employee Creation Error:", error);
            toast({ variant: 'destructive', title: 'فشل إنشاء الموظف', description: "حدث خطأ غير متوقع." });
        }
    }
  }

  function handleResetDeviceId() {
    form.setValue('deviceId', '');
    toast({
        title: 'تم مسح معرّف الجهاز',
        description: 'سيتم تسجيل معرّف الجهاز الجديد عند تسجيل الدخول التالي.',
    });
  }

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1 pr-4">
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
                <Input placeholder="مثال: E006" {...field} disabled={isEditMode} />
                </FormControl>
                <FormDescription>
                    معرف فريد. لا يمكن تغييره بعد الإنشاء.
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
                <Input type="password" {...field} placeholder={isEditMode ? 'اتركه فارغًا لعدم التغيير' : ''} />
                </FormControl>
                    <FormDescription>
                    {isEditMode ? "أدخل كلمة مرور جديدة لتحديثها." : "يجب أن تكون 6 أحرف على الأقل."}
                </FormDescription>
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
                    value={field.value}
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

            {contractType === 'part-time' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border p-4">
                        <FormField
                        control={form.control}
                        name="customCheckInTime"
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
                        name="customCheckOutTime"
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
                    value={field.value}
                    className="flex flex-wrap items-center gap-4"
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
        {isEditMode && deviceVerificationEnabled && (
            <FormField
                control={form.control}
                name="deviceId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>معرف الجهاز المسجل</FormLabel>
                    <div className="flex flex-col sm:flex-row gap-2">
                    <FormControl>
                        <Input {...field} readOnly placeholder="لم يتم تسجيل أي جهاز بعد" />
                    </FormControl>
                    <Button type="button" variant="secondary" onClick={handleResetDeviceId} disabled={!field.value}>
                        <RotateCw className="ml-2 h-4 w-4" />
                        إعادة تعيين
                    </Button>
                    </div>
                    <FormDescription>
                    يتم تسجيل الجهاز تلقائياً عند أول عملية تسجيل دخول ناجحة.
                    </FormDescription>
                    <FormMessage />
                </FormItem>
                )}
        />
        )}
        
        <div className="flex justify-end pt-4">
            <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            <Save className="ml-2 h-4 w-4" />
            {isEditMode ? 'حفظ التعديلات' : 'حفظ الموظف'}
            </Button>
        </div>
        </form>
    </Form>
  );
}

    