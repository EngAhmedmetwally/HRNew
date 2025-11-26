import type { ImagePlaceholder } from './placeholder-images';
import type { Timestamp } from 'firebase/firestore';

export interface Employee {
  id: string; // Corresponds to Firebase Auth UID
  employeeId: string; // Custom employee ID
  email?: string; // Internal-only email, not for user display
  name: string;
  avatar?: ImagePlaceholder; // Make avatar optional as it might not be in Firestore
  department: string;
  jobTitle: string;
  contractType: 'full-time' | 'part-time';
  customCheckInTime?: string; // e.g., "09:30"
  customCheckOutTime?: string; // e.g., "15:30"
  hireDate: string; // ISO date string
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
