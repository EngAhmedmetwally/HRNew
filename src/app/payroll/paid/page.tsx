'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Payroll, Employee } from '@/lib/types';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useMemo, useState, useEffect } from 'react';
import { DateRangePicker } from '@/components/shared/date-range-picker';
import { DateRange } from 'react-day-picker';
import { getYear, getMonth } from 'date-fns';
import { useRouter } from 'next/navigation';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

type PaidPayroll = Payroll & { 
    employeeName: string; 
    status: 'paid' | 'pending';
    _snapshot: QueryDocumentSnapshot<DocumentData>;
};

const statusMap: { [key in 'paid' | 'pending']: { text: string; className: string } } = {
  paid: { text: "مدفوع", className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400" },
  pending: { text: "قيد الانتظار", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400" },
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);
};

export default function PaidPayrollPage() {
  const { firestore } = useFirebase();
  const { user, roles, isUserLoading } = useUser();
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const canView = roles.isAdmin || roles.isHr;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [isUserLoading, user, router]);

  const payrollsQuery = useMemoFirebase(() => {
    if (!firestore || !canView || !dateRange?.from) return null;
    
    // This is a simplification. In a real app, you'd query a `paidAt` timestamp.
    // Here, we just filter by the month/year of the payroll record.
    const fromDate = dateRange.from;
    const year = getYear(fromDate);
    const month = getMonth(fromDate) + 1; // getMonth is 0-indexed

    return query(
      collection(firestore, 'payrolls'),
      where('year', '==', year),
      where('month', '==', month),
      // In a real app, you would add: where('status', '==', 'paid')
      // but we are mocking the status on the client.
    );
  }, [firestore, canView, dateRange]);

  const { data: payrolls, isLoading: isLoadingPayrolls } = useCollection<Payroll>(payrollsQuery);

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !canView) return null;
    return collection(firestore, 'employees');
  }, [firestore, canView]);

  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const combinedData: PaidPayroll[] = useMemo(() => {
    if (!payrolls || !employees) return [];
    const employeeMap = new Map(employees.map(e => [e.id, e.name]));
    // For demo, we'll manually set some as 'paid'
    return payrolls.map((p, index) => ({
      ...p,
      employeeName: employeeMap.get(p.employeeId) || 'موظف غير معروف',
      status: (index % 2 === 0 ? 'paid' : 'pending') as 'paid' | 'pending', // Mock status
    })).filter(p => p.status === 'paid');
  }, [payrolls, employees]);

  const isLoading = isUserLoading || isLoadingPayrolls || isLoadingEmployees;

  if (isLoading || !user) {
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
    <Card>
      <CardHeader className="flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>الرواتب المدفوعة</CardTitle>
          <CardDescription>
            عرض سجلات الرواتب التي تم دفعها للموظفين.
          </CardDescription>
        </div>
        <DateRangePicker dateRange={dateRange} onUpdate={setDateRange} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : combinedData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
             <p>لا توجد رواتب مدفوعة في هذا النطاق الزمني.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اسم الموظف</TableHead>
                <TableHead className="text-right">الراتب الصافي</TableHead>
                <TableHead className="text-right">الشهر</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combinedData.map((payroll) => (
                <TableRow key={payroll.id}>
                  <TableCell className="font-medium text-right">{payroll.employeeName}</TableCell>
                  <TableCell className="font-semibold text-right">{formatCurrency(payroll.netSalary)}</TableCell>
                  <TableCell className="text-right">{payroll.month}/{payroll.year}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className={statusMap[payroll.status].className}>
                      {statusMap[payroll.status].text}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
