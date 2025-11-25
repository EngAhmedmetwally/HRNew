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
import { payrollData } from "@/lib/data";
import { FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusMap = {
  paid: { text: "مدفوع", className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400" },
  pending: { text: "قيد الانتظار", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400" },
};

export default function PayrollPage() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">إدارة الرواتب</h2>
          <p className="text-muted-foreground">
            إنشاء وعرض تقارير الرواتب الشهرية.
          </p>
        </div>
        <Button>
          <FileText className="ml-2 h-4 w-4" />
          إنشاء تقرير رواتب جديد
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>تقرير الرواتب - يوليو 2024</CardTitle>
          <CardDescription>
            ملخص الرواتب المحسوبة للشهر الحالي.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile View */}
          <div className="md:hidden">
            <div className="space-y-4">
              {payrollData.map((payroll) => (
                <Card key={payroll.id} className="bg-muted/50">
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{payroll.employeeName}</CardTitle>
                       <Badge variant="secondary" className={statusMap[payroll.status].className}>
                        {statusMap[payroll.status].text}
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
                  <TableHead>اسم الموظف</TableHead>
                  <TableHead>الراتب الأساسي</TableHead>
                  <TableHead>البدلات</TableHead>
                  <TableHead>الخصومات</TableHead>
                  <TableHead>الراتب الصافي</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollData.map((payroll) => (
                  <TableRow key={payroll.id}>
                    <TableCell className="font-medium">{payroll.employeeName}</TableCell>
                    <TableCell>{formatCurrency(payroll.baseSalary)}</TableCell>
                    <TableCell className="text-green-600 dark:text-green-400">{formatCurrency(payroll.allowances)}</TableCell>
                    <TableCell className="text-red-600 dark:text-red-400">{formatCurrency(payroll.deductions)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(payroll.netSalary)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusMap[payroll.status].className}>
                        {statusMap[payroll.status].text}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
