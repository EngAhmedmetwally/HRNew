'use client';

import { useState, useEffect } from "react";
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
import { PlusCircle, Loader2, ShieldAlert, Pencil, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useCollection, useFirebase, useMemoFirebase, useUser, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, deleteDoc, doc } from "firebase/firestore";
import { getAuth, deleteUser } from "firebase/auth";
import type { Employee } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmployeeForm } from "@/components/employees/employee-form";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";


const statusMap = {
  active: { text: "نشط", variant: "secondary", className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" },
  on_leave: { text: "في إجازة", variant: "secondary", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400" },
  inactive: { text: "غير نشط", variant: "outline", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400" },
};

export default function EmployeesPage() {
  const { firestore, auth } = useFirebase();
  const { user, permissions, isUserLoading } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);
  const router = useRouter();
  const { toast } = useToast();

  const handleOpenDialog = (employee?: Employee) => {
    setEditingEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEmployee(undefined);
  };

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [isUserLoading, user, router]);
  
  const canView = permissions.isAdmin || permissions.screens.includes('employees');

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !canView) return null;
    return collection(firestore, 'employees');
  }, [firestore, canView]);
  
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const isLoading = isUserLoading || (canView && isLoadingEmployees);

  const handleDeleteEmployee = async (employeeToDelete: Employee) => {
    if (!firestore || !auth) return;
    if (employeeToDelete.employeeId === 'admin') {
      toast({
        variant: "destructive",
        title: "لا يمكن حذف المدير",
        description: "لا يمكن حذف حساب المدير الرئيسي للنظام.",
      });
      return;
    }

    const employeeDocRef = doc(firestore, 'employees', employeeToDelete.id);
    
    // Use non-blocking delete with specific error handling
    deleteDoc(employeeDocRef)
      .then(() => {
        toast({
          title: 'تم حذف الموظف',
          description: `تم حذف بيانات الموظف ${employeeToDelete.name} من قاعدة البيانات.`,
          className: 'bg-green-500 text-white',
        });
        // Note: Deleting from Auth requires re-authentication or an admin SDK.
        // This implementation will only delete from Firestore.
        // For full deletion, a backend function is required to delete the Auth user.
      })
      .catch((error) => {
        // Emit a detailed, contextual error for the development overlay
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: employeeDocRef.path,
          operation: 'delete',
        }));
        // Show a generic message to the user
        toast({
          variant: "destructive",
          title: 'فشل الحذف',
          description: 'حدث خطأ أثناء حذف الموظف. قد لا تملك الصلاحيات الكافية.',
        });
      });
  };


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
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">إدارة الموظفين</h1>
          <p className="text-muted-foreground">
            عرض وتعديل بيانات الموظفين في النظام.
          </p>
        </div>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>قائمة الموظفين</CardTitle>
                <CardDescription>
                  {isLoading && !employees ? 'جاري تحميل الموظفين...' : `تم العثور على ${employees?.length || 0} موظف.`}
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenDialog()}>
                  <PlusCircle className="ml-2 h-4 w-4" />
                  إضافة موظف
              </Button>
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
                            <TableCell className="text-right">
                              <Badge variant={statusMap[employee.status as keyof typeof statusMap]?.variant as any} className={statusMap[employee.status as keyof typeof statusMap]?.className}>
                                  {statusMap[employee.status as keyof typeof statusMap]?.text}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
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
                                  <AlertDialog>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80">
                                              <Trash2 className="h-4 w-4" />
                                              <span className="sr-only">حذف الموظف</span>
                                            </Button>
                                          </AlertDialogTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent className="border-destructive text-destructive">
                                          <p>حذف الموظف</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الموظف
                                          <span className="font-bold"> {employee.name} </span>
                                          بشكل دائم.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteEmployee(employee)} className="bg-destructive hover:bg-destructive/90">
                                          نعم، قم بالحذف
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
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
