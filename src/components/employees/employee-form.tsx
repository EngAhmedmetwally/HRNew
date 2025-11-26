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
import { Checkbox } from '@/components/ui/checkbox';
import { useFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import type { Employee } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { menuItems } from '@/components/layout/sidebar';

const availablePermissions = menuItems
  .map(item => ({ id: item.href.replace('/', ''), label: item.label }))
  .filter(p => p.id !== 'scan'); // 'scan' is for all employees

// Zod schema for form validation
const employeeFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: 'الاسم مطلوب' }),
  employeeId: z.string().min(1, { message: 'اسم المستخدم (رقم الموظف) مطلوب' }),
  password: z.string().min(6, "يجب أن تكون كلمة المرور 6 أحرف على الأقل"),
  contractType: z.enum(['full-time', 'part-time'], { required_error: 'نوع العقد مطلوب' }),
  customCheckInTime: z.string().optional(),
  customCheckOutTime: z.string().optional(),
  hireDate: z.string().min(1, { message: 'تاريخ التعيين مطلوب' }),
  baseSalary: z.coerce.number().min(0, { message: 'الراتب يجب أن يكون رقماً موجباً' }),
  status: z.enum(['active', 'inactive', 'on_leave'], { required_error: 'الحالة مطلوبة' }),
  permissions: z.array(z.string()).default([]),
  deviceVerificationEnabled: z.boolean().default(false),
  deviceId: z.string().optional(),
}).refine(data => {
    // If it's a new user (no ID), password is required
    if (!data.id) {
        return !!data.password && data.password.length >= 6;
    }
    // For existing user, if password is provided, it must be valid length
    if (data.id && data.password) {
        return data.password.length >= 6;
    }
    // If it's an existing user and password is not provided, it's ok (don't update)
    return true;
}, {
    message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل.",
    path: ["password"],
});


type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

interface EmployeeFormProps {
    employee?: Employee;
    onFinish: () => void;
}

const defaultFormValues: Partial<EmployeeFormValues> = {
  name: '',
  employeeId: '',
  password: '',
  contractType: 'full-time',
  customCheckInTime: '',
  customCheckOutTime: '',
  hireDate: new Date().toISOString().split('T')[0],
  baseSalary: 0,
  status: 'active',
  permissions: [],
  deviceVerificationEnabled: false,
  deviceId: '',
};

export function EmployeeForm({ employee, onFinish }: EmployeeFormProps) {
  const { toast } = useToast();
  const { firestore, auth } = useFirebase();
  const isEditMode = !!employee;

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: defaultFormValues,
  });
  
  useEffect(() => {
    if (isEditMode && employee) {
        form.reset({
            ...defaultFormValues,
            ...employee,
            id: employee.id,
            password: employee.password || '', // Show existing password for editing
            permissions: employee.permissions || [],
            customCheckInTime: employee.customCheckInTime || '',
            customCheckOutTime: employee.customCheckOutTime || '',
            deviceId: employee.deviceId || '',
        });
    } else {
      form.reset(defaultFormValues);
    }
  }, [employee, isEditMode, form]);
  
  const deviceVerificationEnabled = form.watch('deviceVerificationEnabled');
  const contractType = form.watch('contractType');

  async function onSubmit(data: EmployeeFormValues) {
    if (!firestore || !auth) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم تهيئة خدمات Firebase.' });
        return;
    }

    if (isEditMode && employee) {
        // Handle update
        const employeeDocRef = doc(firestore, 'employees', employee.id);
        try {
            await updateDoc(employeeDocRef, data).catch(e => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: employeeDocRef.path, operation: 'update', requestResourceData: data }));
                throw e;
            });
            // Note: We don't update password in Auth here for simplicity.
            // A production app would require re-authentication or an admin SDK.
            toast({ title: 'تم تحديث بيانات الموظف بنجاح' });
            onFinish();
        } catch (error) {
            console.error('Update failed:', error);
            toast({ variant: 'destructive', title: 'فشل التحديث', description: 'حدث خطأ أثناء تحديث بيانات الموظف.' });
        }
    } else {
        // Handle create new employee
        if (!data.password) {
            form.setError('password', { message: 'كلمة المرور مطلوبة للموظف الجديد.' });
            return;
        }

        const email = `${data.employeeId}@hr-pulse.system`;
        
        try {
            // 1. Create the Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
            const newUserId = userCredential.user.uid;

            // 2. Create the Firestore document with the new user's UID as the document ID
            const employeeDocRef = doc(firestore, 'employees', newUserId);
            const dataToSave = { ...data, id: newUserId };
            
            await setDoc(employeeDocRef, dataToSave).catch(e => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: employeeDocRef.path, operation: 'create', requestResourceData: dataToSave }));
                throw e;
            });
            
            toast({ title: 'تمت إضافة الموظف بنجاح', description: `تم إنشاء حساب للموظف ${data.name}.` });
            onFinish();

        } catch (error: any) {
             console.error("Create employee failed:", error);
              if (error.code === 'auth/email-already-in-use') {
                form.setError('employeeId', { message: 'رقم الموظف هذا مستخدم بالفعل.' });
            } else {
                toast({ variant: 'destructive', title: 'فشل إنشاء الموظف', description: error.message });
            }
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <ScrollArea className="h-[70vh] pr-4">
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
                  <Input type="password" {...field} />
                  </FormControl>
                  <FormDescription>
                    يجب أن تكون 6 أحرف على الأقل.
                  </FormDescription>
                  <FormMessage />
              </FormItem>
              )}
          />

          <FormField
            control={form.control}
            name="permissions"
            render={() => (
                <FormItem>
                <div className="mb-4">
                    <FormLabel className="text-base">صلاحيات الوصول للشاشات</FormLabel>
                    <FormDescription>
                    اختر الشاشات التي يمكن للموظف الوصول إليها.
                    </FormDescription>
                </div>
                <div className='grid grid-cols-2 gap-4 rounded-lg border p-4'>
                    {availablePermissions.map((item) => (
                    <FormField
                        key={item.id}
                        control={form.control}
                        name="permissions"
                        render={({ field }) => {
                        return (
                            <FormItem
                            key={item.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                            >
                            <FormControl>
                                <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                    return checked
                                    ? field.onChange([...(field.value || []), item.id])
                                    : field.onChange(
                                        field.value?.filter(
                                        (value) => value !== item.id
                                        )
                                    )
                                }}
                                />
                            </FormControl>
                            <FormLabel className="font-normal">
                                {item.label}
                            </FormLabel>
                            </FormItem>
                        )
                        }}
                    />
                    ))}
                </div>
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
                              <Input type="time" {...field} value={field.value ?? ''} />
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
                              <Input type="time" {...field} value={field.value ?? ''} />
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
                          <Input {...field} readOnly placeholder="لم يتم تسجيل أي جهاز بعد" value={field.value ?? ''}/>
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
          </ScrollArea>
          
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
