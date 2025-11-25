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
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { WorkDay, Employee } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { findImage } from '@/lib/placeholder-images';

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

  const workDaysQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'workDays'),
      orderBy('checkInTime', 'desc')
    );
  }, [firestore]);

  const { data: workDays, isLoading: isLoadingWorkDays } = useCollection<WorkDay>(workDaysQuery);
  
  const employeesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'employees');
  }, [firestore]);

  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const combinedData: CombinedWorkDay[] = useMemoFirebase(() => {
    if (!workDays || !employees) return [];
    
    const employeesMap = new Map(employees.map(e => [e.id, e]));
    
    return workDays.map(wd => ({
      ...wd,
      employee: employeesMap.get(wd.employeeId),
    }));
  }, [workDays, employees]);

  const isLoading = isLoadingWorkDays || isLoadingEmployees;

  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل الحضور والانصراف</CardTitle>
        <CardDescription>
          عرض سجلات الحضور والانصراف لجميع الموظفين.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
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
              {combinedData.map((record) => (
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
        )}
      </CardContent>
    </Card>
  );
}
