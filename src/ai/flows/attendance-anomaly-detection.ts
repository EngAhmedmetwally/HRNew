'use server';

/**
 * @fileOverview Identifies unusual attendance patterns to flag potential time manipulation or security concerns.
 *
 * - detectAttendanceAnomaly - A function that handles the attendance anomaly detection process.
 * - AttendanceAnomalyInput - The input type for the detectAttendanceAnomaly function.
 * - AttendanceAnomalyOutput - The return type for the detectAttendanceAnomaly function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AttendanceAnomalyInputSchema = z.object({
  employeeId: z.string().describe('The ID of the employee.'),
  clockInTime: z.string().describe('The clock-in time of the employee (ISO format).'),
  clockOutTime: z.string().optional().describe('The clock-out time of the employee (ISO format).'),
  location: z.string().optional().describe("The employee's location coordinates (latitude,longitude) during clock-in (optional)."),
  attendanceHistory: z.string().describe('The attendance history of the employee (JSON format).'),
});
export type AttendanceAnomalyInput = z.infer<typeof AttendanceAnomalyInputSchema>;

const AttendanceAnomalyOutputSchema = z.object({
  isAnomaly: z.boolean().describe('Whether the attendance record is an anomaly.'),
  reason: z.string().optional().describe('The reason for the anomaly, if any.'),
});
export type AttendanceAnomalyOutput = z.infer<typeof AttendanceAnomalyOutputSchema>;

export async function detectAttendanceAnomaly(input: AttendanceAnomalyInput): Promise<AttendanceAnomalyOutput> {
  return detectAttendanceAnomalyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'attendanceAnomalyPrompt',
  input: {schema: AttendanceAnomalyInputSchema},
  output: {schema: AttendanceAnomalyOutputSchema},
  prompt: `You are an HR expert specializing in detecting attendance anomalies. The main work location and allowed radius are configured in the system settings.

You will be provided with the employee ID, clock-in time, clock-out time, location (optional), and attendance history of an employee.

Your task is to determine if the current attendance record is an anomaly based on the provided information.

Consider the following factors when determining if an anomaly exists:

- Unusual clock-in/out times compared to the employee's historical attendance.
- **Suspicious locations: Anomaly if the employee's location is provided and is outside the allowed radius from the main work location configured in the settings.**
- Inconsistencies in the attendance record.

Respond with whether the record is an anomaly or not.

Employee ID: {{{employeeId}}}
Clock-in Time: {{{clockInTime}}}
Clock-out Time: {{{clockOutTime}}}
Location: {{{location}}}
Attendance History: {{{attendanceHistory}}}

Anomaly detected: {{isAnomaly}}
Reason: {{reason}}`,
});

const detectAttendanceAnomalyFlow = ai.defineFlow(
  {
    name: 'detectAttendanceAnomalyFlow',
    inputSchema: AttendanceAnomalyInputSchema,
    outputSchema: AttendanceAnomalyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
