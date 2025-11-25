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
import { employees } from "@/lib/data";
import { PlusCircle, Pencil } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";


const statusMap = {
  active: { text: "نشط", variant: "secondary", className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400" },
  on_leave: { text: "في إجازة", variant: "secondary", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400" },
  inactive: { text: "غير نشط", variant: "outline" },
};

export default function EmployeesPage() {
  return (
    <TooltipProvider>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">إدارة الموظفين</h2>
            <p className="text-muted-foreground">
              عرض وتعديل بيانات الموظفين في النظام.
            </p>
          </div>
          <Button asChild>
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
              تم العثور على {employees.length} موظف.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم الموظف</TableHead>
                  <TableHead>رقم الموظف</TableHead>
                  <TableHead>القسم</TableHead>
                  <TableHead>المنصب الوظيفي</TableHead>

                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={employee.avatar.imageUrl} alt="Avatar" />
                          <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{employee.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{employee.id}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.jobTitle}</TableCell>
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
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
