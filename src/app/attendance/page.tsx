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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCollection, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, where, Timestamp } from 'firebase/firestore';
import type { WorkDay, Employee } from '@/lib/types';
import { Loader2, ShieldAlert } from 'lucide-react';
import { findImage } from '@/lib/placeholder-images';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useMemo, useState } from 'react';
import { DateRangePicker } from '@/components/shared/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';

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

export default function AttendanceLogPage() {
  const { firestore } = useFirebase();
  const { user, roles, isUserLoading } = useUser();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 20),
    to: new Date(),
  });

  const canView = roles.isAdmin || roles.isHr;

  const workDaysQuery = useMemoFirebase(() => {
    if (!firestore || !user || !canView || !dateRange?.from) return null;
    
    const startTimestamp = Timestamp.fromDate(dateRange.from);
    // To include the whole 'to' day, we set the time to the end of the day.
    const endOfDay = new Date(dateRange.to || dateRange.from);
    endOfDay.setHours(23, 59, 59, 999);
    const endTimestamp = Timestamp.fromDate(endOfDay);

    return query(
      collection(firestore, 'workDays'),
      orderBy('checkInTime', 'desc'),
      where('checkInTime', '>=', startTimestamp),
      where('checkInTime', '<=', endTimestamp)
    );
  }, [firestore, user, canView, dateRange]);

  const { data: workDays, isLoading: isLoadingWorkDays } = useCollection<WorkDay>(workDaysQuery);
  
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

  if (isLoading && combinedData.length === 0) {
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
            <CardTitle>سجل الحضور والانصراف</CardTitle>
            <CardDescription>
              عرض وتصفية سجلات الحضور لجميع الموظفين.
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
             <p>لا توجد سجلات حضور في هذا النطاق الزمني.</p>
          </div>
        ) : (
          <>
            {/* Mobile View */}
             <div className="md:hidden">
                <div className="space-y-4">
                  {combinedData.map((record) => (
                      <Card key={record.id} className="bg-muted/50">
                        <CardHeader className="p-4 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                              {record.employee ? (
                                <>
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={findImage(`avatar${(parseInt(record.employee.employeeId.slice(-1)) % 5) + 1}`)?.imageUrl} alt="Avatar" />
                                    <AvatarFallback>{record.employee.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <CardTitle className="text-lg">{record.employee.name}</CardTitle>
                                </>
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
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>وقت الحضور</TableHead>
                    <TableHead>وقت الانصراف</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        </TableCell>
                    </TableRow>
                  ) : combinedData.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {record.employee ? (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage
                              src={findImage(`avatar${(parseInt(record.employee.employeeId.slice(-1)) % 5) + 1}`)?.imageUrl}
                              alt="Avatar"
                            />
                            <AvatarFallback>
                              {record.employee.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{record.employee.name}</div>
                        </div>
                         ) : (
                            <div className="font-medium">{record.employeeId}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.checkInTime?.toDate().toLocaleTimeString('ar-EG') || '---'}
                      </TableCell>
                      <TableCell>
                        {record.checkOutTime?.toDate().toLocaleTimeString('ar-EG') || '--:--'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            record.delayMinutes > 0
                              ? statusMap.late.className
                              : statusMap['on-time'].className
                          }
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
