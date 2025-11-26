'use client';

import { StatsCards } from "@/components/dashboard/stats-cards";
import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import { AnomalyDetector } from "@/components/dashboard/anomaly-detector";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCollection, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, Timestamp, orderBy } from "firebase/firestore";
import type { WorkDay, Employee } from "@/lib/types";
import { Loader2, ShieldAlert } from "lucide-react";
import { findImage } from "@/lib/placeholder-images";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMemo } from 'react';

type CombinedWorkDay = WorkDay & { employee?: Employee };

const statusMap = {
  'on-time': {
    text: 'في الوقت المحدد',
    className:
      'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
  },
  late: {
    text: 'متأخر',
    className:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
  },
};

export default function DashboardPage() {
    const { firestore } = useFirebase();
    const { user, roles, isUserLoading } = useUser();

    const canView = roles.isAdmin || roles.isHr;

    const dailyWorkDaysQuery = useMemoFirebase(() => {
        if (!firestore || !user || !canView) return null;
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const startOfDayTimestamp = Timestamp.fromDate(startOfDay);

        return query(
            collection(firestore, 'workDays'), 
            where('checkInTime', '>=', startOfDayTimestamp),
            orderBy('checkInTime', 'desc')
        );
    }, [firestore, user, canView]);
    
    const { data: workDays, isLoading: isLoadingWorkDays } = useCollection<WorkDay>(dailyWorkDaysQuery);

    const employeesQuery = useMemoFirebase(() => {
        if (!firestore || !user || !canView) return null;
        return collection(firestore, 'employees');
    }, [firestore, user, canView]);

    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

    const combinedData: CombinedWorkDay[] = useMemo(() => {
        if (!workDays || !employees) return [];
        
        const employeesMap = new Map(employees.map(e => [e.id, e]));
        
        return workDays.map(wd => ({
        ...wd,
        employee: employeesMap.get(wd.employeeId),
        }));
    }, [workDays, employees]);

    const isLoading = isUserLoading || (canView && (isLoadingWorkDays || isLoadingEmployees));

    if (isLoading) {
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
    <div className="flex-1 space-y-4 md:space-y-8">
      <StatsCards />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        <div className="lg:col-span-2">
          <AttendanceChart />
        </div>
        <div className="lg:col-span-1">
          <AnomalyDetector />
        </div>
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>سجل الحضور اليومي</CardTitle>
              <CardDescription>
                عرض سجلات الحضور والانصراف لجميع الموظفين اليوم.
              </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : combinedData.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>لا توجد سجلات حضور اليوم حتى الآن.</p>
                    </div>
                ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>الموظف</TableHead>
                        <TableHead className="hidden sm:table-cell">وقت الحضور</TableHead>
                        <TableHead className="hidden md:table-cell">وقت الانصراف</TableHead>
                        <TableHead>الحالة</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {combinedData.map((record) => (
                        <TableRow key={record.id}>
                        <TableCell>
                            {record.employee ? (
                            <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={findImage(`avatar${(parseInt(record.employee.employeeId.slice(-1)) % 5) + 1}`)?.imageUrl} alt="Avatar" />
                                <AvatarFallback>{record.employee.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="font-medium">{record.employee.name}</div>
                            </div>
                            ) : (
                                <div className="font-medium">{record.employeeId}</div>
                            )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{record.checkInTime?.toDate().toLocaleTimeString('ar-EG') || '---'}</TableCell>
                        <TableCell className="hidden md:table-cell">{record.checkOutTime?.toDate().toLocaleTimeString('ar-EG') || '--:--'}</TableCell>
                        <TableCell>
                            <Badge
                            variant='secondary'
                            className={record.delayMinutes > 0 ? statusMap.late.className : statusMap['on-time'].className}
                            >
                            {record.delayMinutes > 0 ? 'متأخر' : 'في الوقت المحدد'}
                            </Badge>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
