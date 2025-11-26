'use client';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowUpCircle, ArrowDownCircle, Banknote, FileDigit, Loader2, ShieldAlert } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useMemo, useEffect } from "react";
import type { Payroll, Employee } from '@/lib/types';
import { useCollection, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { DateRange } from "react-day-picker";
import { getYear, getMonth } from "date-fns";
import { useRouter } from "next/navigation";


const statusMap = {
  paid: { text: "مدفوع", className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400" },
  pending: { text: "قيد الانتظار", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400" },
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);
};
  

export default function PayrollPage() {
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

  const payrollsQuery = useMemoFirebase(()=>{
    if (!firestore || !canView || !dateRange?.from) return null;
    
    // We filter by month and year of the start date. This is a simplification.
    // A more robust solution might involve querying a date field on the payroll document.
    const fromDate = dateRange.from;
    const year = getYear(fromDate);
    const month = getMonth(fromDate) + 1; // getMonth is 0-indexed

    return query(
      collection(firestore, 'payrolls'),
      where('year', '==', year),
      where('month', '==', month)
    );
  }, [firestore, canView, dateRange]);

  const { data: payrolls, isLoading: isLoadingPayrolls } = useCollection<Payroll>(payrollsQuery);

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !canView) return null;
    return collection(firestore, 'employees');
  }, [firestore, canView]);

  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const combinedData = useMemo(() => {
    if (!payrolls || !employees) return [];
    const employeeMap = new Map(employees.map(e => [e.id, e.name]));
    return payrolls.map(p => ({
      ...p,
      employeeName: employeeMap.get(p.employeeId) || 'موظف غير معروف',
      status: 'pending' // Default status
    }));
  }, [payrolls, employees]);

  const totals = useMemo(() => {
    if (!combinedData) {
        return { baseSalary: 0, allowances: 0, deductions: 0, netSalary: 0 };
    }
    return combinedData.reduce((acc, payroll) => {
        acc.baseSalary += payroll.baseSalary;
        acc.allowances += payroll.allowances;
        acc.deductions += payroll.deductions;
        acc.netSalary += payroll.netSalary;
        return acc;
    }, { baseSalary: 0, allowances: 0, deductions: 0, netSalary: 0 });
  }, [combinedData]);

  
  const isLoading = isUserLoading || isLoadingPayrolls || isLoadingEmployees;

  if (isUserLoading || !user) {
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">إدارة الرواتب</h2>
          <p className="text-muted-foreground">
            إنشاء وعرض تقارير الرواتب الشهرية.
          </p>
        </div>
        <Button className="w-full sm:w-auto">
          <FileText className="ml-2 h-4 w-4" />
          إنشاء تقرير رواتب جديد
        </Button>
      </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي صافي الرواتب</CardTitle>
                <Banknote className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totals.netSalary)}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي البدلات</CardTitle>
                <ArrowUpCircle className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totals.allowances)}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الخصومات</CardTitle>
                <ArrowDownCircle className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totals.deductions)}</div>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">عدد الموظفين</CardTitle>
                <FileDigit className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{combinedData.length}</div>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>تقرير الرواتب</CardTitle>
                <CardDescription>
                  ملخص الرواتب المحسوبة للفترة المحددة.
                </CardDescription>
              </div>
               <DateRangePicker dateRange={dateRange} onUpdate={setDateRange} />
            </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="mt-2 text-muted-foreground">جاري تحميل بيانات الرواتب...</p>
             </div>
          ) : combinedData.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground">
                <p>لا توجد بيانات رواتب لهذا الشهر.</p>
                <p className="text-sm">يمكنك إنشاء تقرير جديد من الزر أعلاه.</p>
             </div>
          ) : (
            <>
            {/* Mobile View */}
            <div className="md:hidden">
                <div className="space-y-4">
                {combinedData.map((payroll) => (
                    <Card key={payroll.id} className="bg-muted/50">
                    <CardHeader className="p-4">
                        <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">{payroll.employeeName}</CardTitle>
                        <Badge variant="secondary" className={statusMap[payroll.status as keyof typeof statusMap].className}>
                            {statusMap[payroll.status as keyof typeof statusMap].text}
                        </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-sm">
                        <div className="flex justify-between border-t border-border pt-2 mt-2">
                        <p className="text-muted-foreground">الراتب الصافي</p>
                        <p className="font-semibold">{formatCurrency(payroll.netSalary)}</p>
                        </div>
                        <div className="flex justify-between mt-2">
                        <p className="text-muted-foreground">الراتب الأساسي</p>
                        <p>{formatCurrency(payroll.baseSalary)}</p>
                        </div>
                        <div className="flex justify-between mt-2">
                        <p className="text-muted-foreground">البدلات</p>
                        <p className="text-green-600 dark:text-green-400">{formatCurrency(payroll.allowances)}</p>
                        </div>
                        <div className="flex justify-between mt-2">
                        <p className="text-muted-foreground">الخصومات</p>
                        <p className="text-red-600 dark:text-red-400">{formatCurrency(payroll.deductions)}</p>
                        </div>
                    </CardContent>
                    </Card>
                ))}
                </div>
            </div>
            
            {/* Desktop View */}
            <div className="hidden md:block">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="text-right">اسم الموظف</TableHead>
                    <TableHead className="text-right">الراتب الأساسي</TableHead>
                    <TableHead className="text-right">البدلات</TableHead>
                    <TableHead className="text-right">الخصومات</TableHead>
                    <TableHead className="text-right">الراتب الصافي</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {combinedData.map((payroll) => (
                    <TableRow key={payroll.id}>
                        <TableCell className="font-medium text-right">{payroll.employeeName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(payroll.baseSalary)}</TableCell>
                        <TableCell className="text-green-600 dark:text-green-400 text-right">{formatCurrency(payroll.allowances)}</TableCell>
                        <TableCell className="text-red-600 dark:text-red-400 text-right">{formatCurrency(payroll.deductions)}</TableCell>
                        <TableCell className="font-semibold text-right">{formatCurrency(payroll.netSalary)}</TableCell>
                        <TableCell className="text-right">
                        <Badge variant="secondary" className={statusMap[payroll.status as keyof typeof statusMap].className}>
                            {statusMap[payroll.status as keyof typeof statusMap].text}
                        </Badge>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
