'use client';

import { useActionState as useReactActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { runAttendanceAnomalyDetection } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCollection, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Employee } from '@/lib/types';

const initialState = {
  isAnomaly: undefined,
  reason: '',
  error: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-accent hover:bg-accent/90">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      تحليل الحضور
    </Button>
  );
}

export function AnomalyDetector() {
  const [state, formAction] = useReactActionState(
    runAttendanceAnomalyDetection,
    initialState
  );
  const [showResult, setShowResult] = useState(false);
  const { firestore } = useFirebase();
  const { user, permissions, isUserLoading } = useUser();
  const canView = permissions.isAdmin || permissions.screens.includes('dashboard');

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !canView) return null;
    return collection(firestore, 'employees');
  }, [firestore, user, canView]);

  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  useEffect(() => {
    if (state.isAnomaly !== undefined || state.error) {
      setShowResult(true);
      const timer = setTimeout(() => setShowResult(false), 5000); // Hide after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [state]);

  // Set default time to current time
  const [currentTime, setCurrentTime] = useState('');
  useEffect(() => {
    const now = new Date();
    const formattedTime = now.toTimeString().slice(0, 5); // HH:MM
    setCurrentTime(`${new Date().toISOString().slice(0, 10)}T${formattedTime}`);
  }, []);

  return (
    <Card className="shadow-sm h-full">
      <CardHeader>
        <CardTitle>كاشف الحالات الشاذة في الحضور</CardTitle>
        <CardDescription>
          استخدم الذكاء الاصطناعي لتحديد أنماط الحضور غير العادية.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employeeId">الموظف</Label>
            <Select name="employeeId" required>
              <SelectTrigger id="employeeId" disabled={isLoadingEmployees || isUserLoading || !canView}>
                <SelectValue placeholder={(isLoadingEmployees || isUserLoading) ? "جاري تحميل الموظفين..." : "اختر موظفًا"} />
              </SelectTrigger>
              <SelectContent>
                {employees
                  ?.filter((e) => e.status === 'active')
                  .map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clockInTime">وقت الحضور</Label>
            <Input
              id="clockInTime"
              name="clockInTime"
              type="datetime-local"
              required
              defaultValue={currentTime}
            />
          </div>
          <SubmitButton />
        </form>
        {showResult && (
          <div className="mt-4">
            {state.error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>خطأ</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : state.isAnomaly !== undefined && state.isAnomaly ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>تم كشف حالة شاذة!</AlertTitle>
                <AlertDescription>{state.reason}</AlertDescription>
              </Alert>
            ) : state.isAnomaly !== undefined && !state.isAnomaly ? (
              <Alert className="border-green-500 text-green-700 dark:border-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>حضور طبيعي</AlertTitle>
                <AlertDescription>
                  لم يتم الكشف عن أي حالة شاذة في هذا الحضور.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
