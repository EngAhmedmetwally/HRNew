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
import { useCollection, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, Timestamp, orderBy } from "firebase/firestore";
import type { WorkDay, Employee } from "@/lib/types";
import { Loader2, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMemo, useEffect } from 'react';
import { useRouter } from "next/navigation";

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

function DailyAttendanceLog({ combinedData, isLoading }: { combinedData: CombinedWorkDay[], isLoading: boolean }) {
    return (
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
                <>
                {/* Mobile View */}
                <div className="md:hidden space-y-4">
                  {combinedData.map((record) => (
                      <Card key={record.id} className="bg-muted/50">
                        <CardHeader className="p-4 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                              {record.employee ? (
                                <CardTitle className="text-lg">{record.employee.name}</CardTitle>
                              ) : (
                                  <CardTitle className="text-lg">{record.employeeId}</CardTitle>
                              )}
                            </div>
                            <Badge
                              variant="secondary"
                              className={record.delayMinutes > 0 ? statusMap.late.className : statusMap['on-time'].className}
                            >
                              {record.delayMinutes > 0 ? 'متأخر' : 'في الوقت المحدد'}
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 text-sm">
                          <div className="flex justify-between border-t pt-2 mt-2">
                              <p className="text-muted-foreground">وقت الحضور</p>
                              <p className="font-semibold">{record.checkInTime?.toDate().toLocaleTimeString('ar-EG') || '---'}</p>
                          </div>
                          <div className="flex justify-between mt-2">
                              <p className="text-muted-foreground">وقت الانصراف</p>
                              <p>{record.checkOutTime?.toDate().toLocaleTimeString('ar-EG') || '--:--'}</p>
                          </div>
                        </CardContent>
                      </Card>
                  ))}
                </div>
                {/* Desktop View */}
                <div className="hidden md:block">
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead className="text-right">الموظف</TableHead>
                          <TableHead className="hidden sm:table-cell text-right">وقت الحضور</TableHead>
                          <TableHead className="hidden md:table-cell text-right">وقت الانصراف</TableHead>
                          <TableHead className="text-right">الحالة</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {combinedData.map((record) => (
                          <TableRow key={record.id}>
                          <TableCell>
                              <div className="font-medium text-right">{record.employee?.name || record.employeeId}</div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-right">{record.checkInTime?.toDate().toLocaleTimeString('ar-EG') || '---'}</TableCell>
                          <TableCell className="hidden md:table-cell text-right">{record.checkOutTime?.toDate().toLocaleTimeString('ar-EG') || '--:--'}</TableCell>
                          <TableCell className="text-right">
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
                </div>
                </>
                )}
            </CardContent>
          </Card>
    );
}

export default function DashboardPage() {
    const { firestore } = useFirebase();
    const { user, roles, isUserLoading } = useUser();
    const router = useRouter();

    const canView = roles.isAdmin || roles.isHr;

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.replace('/login');
        }
    }, [isUserLoading, user, router]);

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
        if (!firestore || !canView) return null;
        return collection(firestore, 'employees');
    }, [firestore, canView]);

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
    <div className="flex-1 space-y-4 md:space-y-8">
      <StatsCards />
      <div className="grid grid-cols-1 gap-4 md:gap-8">
        <AnomalyDetector />
        <AttendanceChart />
        <DailyAttendanceLog combinedData={combinedData} isLoading={isLoading} />
      </div>
    </div>
  );
}
