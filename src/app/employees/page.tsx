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
import { PlusCircle, Pencil, Loader2, ShieldAlert } from "lucide-react";
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
  active: { text: "نشط", variant: "secondary", className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400" },
  on_leave: { text: "في إجازة", variant: "secondary", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400" },
  inactive: { text: "غير نشط", variant: "outline" },
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
    <TooltipProvider>
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">إدارة الموظفين</h2>
            <p className="text-muted-foreground">
              عرض وتعديل بيانات الموظفين في النظام.
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/employees/new">
              <PlusCircle className="ml-2 h-4 w-4" />
              إضافة موظف جديد
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
            {isLoading ? (
               <div className="flex justify-center items-center h-48">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
               </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم الموظف</TableHead>
                  <TableHead className="hidden sm:table-cell">رقم الموظف</TableHead>
                  <TableHead className="hidden md:table-cell">المنصب الوظيفي</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees?.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={findImage(`avatar${(parseInt(employee.employeeId.slice(-1)) % 5) + 1}`)?.imageUrl} alt="Avatar" />
                          <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="font-medium">{employee.name}</span>
                            <span className="text-muted-foreground text-sm sm:hidden">{employee.employeeId}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{employee.employeeId}</TableCell>
                    <TableCell className="hidden md:table-cell">{employee.jobTitle}</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[employee.status].variant as any} className={statusMap[employee.status].className}>
                        {statusMap[employee.status].text}
                      </Badge>
                    </TableCell>
                    <TableCell>
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
                          <p>تعديل الموظف</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
