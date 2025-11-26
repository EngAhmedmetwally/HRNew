'use client';

import type { ImagePlaceholder } from './placeholder-images';
import type { Timestamp } from 'firebase/firestore';

export interface Employee {
  id: string; // Corresponds to Firebase Auth UID
  employeeId: string; // Custom employee ID used for login
  name: string;
  password?: string; // Stored in DB for direct comparison
  contractType: 'full-time' | 'part-time';
  customCheckInTime?: string;
  customCheckOutTime?: string;
  hireDate: string;
  status: 'active' | 'on_leave' | 'inactive';
  baseSalary: number;
  deviceVerificationEnabled?: boolean;
  deviceId?: string;
  permissions: string[]; // List of accessible screen keys (e.g., 'dashboard', 'employees')
}


export interface AttendanceRecord {
  employee: Employee;
  checkInTime: string;
  status: 'on-time' | 'late';
}

export interface Payroll {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  overtimePay: number;
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
