export interface Employee {
  id: string;
  businessId: string;
  name: string;
  payType: "Salary" | "Hourly";
  payRate: number;
  defaultHours: number;
  deductionRate: number;
  status: "Active" | "Inactive";
  createdAt: any;
  updatedAt: any;
}

export interface PayrollRunItem {
  employeeId: string;
  hours: number;
  gross: number;
  deductions: number;
  net: number;
}

export interface PayrollRun {
  id: string;
  businessId: string;
  periodStart: any;
  periodEnd: any;
  status: "Draft" | "Processed";
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  items: PayrollRunItem[];
  createdAt: any;
}
