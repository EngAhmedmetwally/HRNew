import type { ImagePlaceholder } from './placeholder-images';
import type { Timestamp } from 'firebase/firestore';

export interface Employee {
  id: string; // Corresponds to a unique ID, but not necessarily Firebase Auth UID anymore
  employeeId: string; // Custom employee ID
  password?: string; // Stored in Firestore, not Auth
  name: string;
  avatar?: ImagePlaceholder;
  department: string;
  jobTitle: string;
  contractType: 'full-time' | 'part-time';
  customCheckInTime?: string;
  customCheckOutTime?: string;
  hireDate: string;
  status: 'active' | 'on_leave' | 'inactive';
  baseSalary: number;
  deviceVerificationEnabled?: boolean;
  deviceId?: string;
}


export interface AttendanceRecord {
  employee: Employee;
  checkInTime: string;
  status: 'on-time' | 'late';
}

export interface Payroll {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'paid' | 'pending';
}

export interface WorkDay {
    id: string;
    date: Timestamp;
    employeeId: string;
    checkInTime: Timestamp;
    checkOutTime: Timestamp | null;
    totalWorkHours: number;
    delayMinutes: number;
    overtimeHours: number;
}
