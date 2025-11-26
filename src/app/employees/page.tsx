'use client';

import { useState } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmployeeForm } from "@/components/employees/employee-form";


const statusMap = {
  active: { text: "نشط", variant: "secondary", className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" },
  on_leave: { text: "في إجازة", variant: "secondary", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400" },
  inactive: { text: "غير نشط", variant: "outline", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400" },
};

export default function EmployeesPage() {
  const { firestore } = useFirebase();
  const { user, roles, isUserLoading } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);

  const handleOpenDialog = (employee?: Employee) => {
    setEditingEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEmployee(undefined);
  };
  
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
          <Button className="w-full sm:w-auto" onClick={() => handleOpenDialog()}>
              <PlusCircle className="ml-2 h-4 w-4" />
              إضافة موظف
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
                              <div className="font-medium text-right">{employee.name}</div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-right">{employee.employeeId}</TableCell>
                            <TableCell className="hidden md:table-cell text-right">{employee.jobTitle}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={statusMap[employee.status as keyof typeof statusMap]?.variant as any} className={statusMap[employee.status as keyof typeof statusMap]?.className}>
                                  {statusMap[employee.status as keyof typeof statusMap]?.text}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(employee)}>
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">تعديل الموظف</span>
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
                     <Button className="mt-4" onClick={() => handleOpenDialog()}>
                        <PlusCircle className="ml-2 h-4 w-4" />
                        إضافة موظف جديد
                    </Button>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

       <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
            <DialogContent className="sm:max-w-[525px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingEmployee ? `تعديل بيانات: ${editingEmployee.name}` : 'إضافة موظف جديد'}</DialogTitle>
                </DialogHeader>
                <EmployeeForm employee={editingEmployee} onFinish={handleCloseDialog} />
            </DialogContent>
        </Dialog>
    </TooltipProvider>
  );
}
