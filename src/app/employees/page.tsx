'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { PlusCircle, Loader2, ShieldAlert, Pencil } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useCollection, useFirebase, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Employee } from "@/lib/types";
import { findImage } from "@/lib/placeholder-images";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const statusMap = {
  active: { text: "نشط", variant: "secondary", className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" },
  on_leave: { text: "في إجازة", variant: "secondary", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400" },
  inactive: { text: "غير نشط", variant: "outline", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400" },
};

export default function EmployeesPage() {
  const { firestore } = useFirebase();
  const { user, roles, isUserLoading } = useUser();
  
  const canView = roles.isAdmin || roles.isHr;

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !canView) return null;
    return collection(firestore, 'employees');
  }, [firestore, user, canView]);
  
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const isLoading = isUserLoading || (canView && isLoadingEmployees);

  if (isLoading && !employees) {
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
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">إدارة الموظفين</h1>
            <p className="text-muted-foreground">
              عرض وتعديل بيانات الموظفين في النظام.
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/employees/new">
              <PlusCircle className="ml-2 h-4 w-4" />
              إضافة موظف
            </Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>قائمة الموظفين</CardTitle>
            <CardDescription>
              {isLoading ? 'جاري تحميل الموظفين...' : `تم العثور على ${employees?.length || 0} موظف.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !employees ? (
               <div className="flex justify-center items-center h-64">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
               </div>
            ) : employees && employees.length > 0 ? (
                 <Table>
                    <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">اسم الموظف</TableHead>
                          <TableHead className="hidden sm:table-cell text-right">رقم الموظف</TableHead>
                          <TableHead className="hidden md:table-cell text-right">المنصب الوظيفي</TableHead>
                          <TableHead className="text-right">الحالة</TableHead>
                          <TableHead className="text-right">الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {employees.map((employee) => (
                        <TableRow key={employee.id} className="hover:bg-muted/50">
                            <TableCell>
                            <div className="flex items-center justify-end gap-3">
                                <div className="font-medium text-right">{employee.name}</div>
                                <Avatar className="h-10 w-10">
                                <AvatarImage src={findImage(`avatar${(parseInt(employee.employeeId.slice(-1)) % 5) + 1}`)?.imageUrl} alt="Avatar" />
                                <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-right">{employee.employeeId}</TableCell>
                            <TableCell className="hidden md:table-cell text-right">{employee.jobTitle}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={statusMap[employee.status]?.variant as any} className={statusMap[employee.status]?.className}>
                                  {statusMap[employee.status]?.text}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button asChild variant="ghost" size="icon">
                                            <Link href={`/employees/${employee.id}/edit`}>
                                                <Pencil className="h-4 w-4" />
                                                <span className="sr-only">تعديل الموظف</span>
                                            </Link>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>تعديل بيانات الموظف</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            ) : (
                <div className="text-center py-16 text-muted-foreground">
                    <p className="text-lg font-semibold">لم يتم العثور على موظفين</p>
                    <p className="text-sm mt-2">يمكنك إضافة موظف جديد لبدء إدارة فريقك.</p>
                     <Button asChild className="mt-4">
                        <Link href="/employees/new">
                        <PlusCircle className="ml-2 h-4 w-4" />
                        إضافة موظف جديد
                        </Link>
                    </Button>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
