import React, { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Loader2,
  Calendar,
  DollarSign,
  History,
  CheckCircle2
} from "lucide-react";
import { Card, Button, Badge, Input, Select, Modal } from "../components/ui";
import { useAppContext } from "../app/providers";
import { api } from "../api/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "../components/ui";

export const PayrollPage = () => {
  const { business } = useAppContext();
  const [employees, setEmployees] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);

  // Employee Form
  const [empName, setEmpName] = useState("");
  const [empPayType, setEmpPayType] = useState("Salary");
  const [empPayRate, setEmpPayRate] = useState("");

  // Payroll Run Form
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [hourlyInputs, setHourlyInputs] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!business) return;
    const fetchData = async () => {
      try {
        const [emps, pruns] = await Promise.all([
          api.getEmployees(business.id),
          api.getPayrollRuns(business.id)
        ]);
        setEmployees(emps);
        setRuns(pruns);
      } catch (error) {
        console.error("Error fetching payroll data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [business]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setLoading(true);
    try {
      await api.createEmployee({
        businessId: business.id,
        name: empName,
        payType: empPayType,
        payRate: parseFloat(empPayRate),
      });
      const emps = await api.getEmployees(business.id);
      setEmployees(emps);
      setIsEmpModalOpen(false);
      setEmpName("");
      setEmpPayRate("");
    } catch (error) {
      console.error("Error adding employee:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPayroll = async () => {
    if (!business) return;
    setLoading(true);
    try {
      const accounts = await api.getAccounts(business.id);
      const cashAcc = accounts.find(a => a.name === "Cash")?.id;
      const expAcc = accounts.find(a => a.name === "Payroll Expense")?.id;
      const liabAcc = accounts.find(a => a.name === "Payroll Taxes Payable")?.id;

      if (!cashAcc || !expAcc || !liabAcc) {
        alert("Please ensure you have 'Cash', 'Payroll Expense', and 'Payroll Taxes Payable' accounts set up in Settings.");
        return;
      }

      const employeeInputs = employees.map(emp => ({
        employeeId: emp.id,
        hours: hourlyInputs[emp.id] || 160
      }));

      await api.runPayroll({
        businessId: business.id,
        periodStart,
        periodEnd,
        cashAccountId: cashAcc,
        expenseAccountId: expAcc,
        liabilityAccountId: liabAcc,
        employeeInputs
      });

      const pruns = await api.getPayrollRuns(business.id);
      setRuns(pruns);
      setIsRunModalOpen(false);
    } catch (error) {
      console.error("Error running payroll:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payroll</h1>
          <p className="text-slate-500">Manage employees and process payroll</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setIsEmpModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Employee</Button>
          <Button onClick={() => setIsRunModalOpen(true)}><DollarSign className="w-4 h-4 mr-2" /> Run Payroll</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Employee List */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Employees">
            <div className="divide-y divide-slate-100">
              {employees.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No employees found.</p>
              ) : (
                employees.map(emp => (
                  <div key={emp.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{emp.name}</div>
                        <div className="text-xs text-slate-500">{emp.payType} • ${emp.payRate.toLocaleString()}/{emp.payType === "Salary" ? "yr" : "hr"}</div>
                      </div>
                    </div>
                    <Badge variant={emp.status === "Active" ? "success" : "neutral"}>{emp.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card title="Payroll History">
            <div className="divide-y divide-slate-100">
              {runs.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No payroll history.</p>
              ) : (
                runs.map(run => (
                  <div key={run.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                        <History className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">
                          {format(new Date(run.periodStart.toDate ? run.periodStart.toDate() : run.periodStart), "MMM dd")} - {format(new Date(run.periodEnd.toDate ? run.periodEnd.toDate() : run.periodEnd), "MMM dd, yyyy")}
                        </div>
                        <div className="text-xs text-slate-500">Total Net: ${run.totalNet.toLocaleString()}</div>
                      </div>
                    </div>
                    <Badge variant="success">Processed</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Payroll Stats */}
        <div className="space-y-6">
          <Card className="bg-indigo-600 text-white border-none shadow-xl shadow-indigo-200">
            <div className="flex items-center gap-3 mb-4 opacity-80">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold uppercase tracking-widest text-xs">Next Pay Date</span>
            </div>
            <div className="text-3xl font-black mb-1">April 01, 2026</div>
            <div className="text-indigo-100 text-sm">Monthly processing cycle</div>
          </Card>

          <Card title="Quick Summary">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Active Employees</span>
                <span className="font-bold text-slate-900">{employees.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Monthly Gross</span>
                <span className="font-bold text-slate-900">
                  ${employees.reduce((sum, emp) => sum + (emp.payType === "Salary" ? emp.payRate / 12 : emp.payRate * 160), 0).toLocaleString()}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={isEmpModalOpen} onClose={() => setIsEmpModalOpen(false)} title="Add New Employee">
        <form onSubmit={handleAddEmployee} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <Input value={empName} onChange={(e) => setEmpName(e.target.value)} placeholder="e.g. Jane Doe" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pay Type</label>
              <Select value={empPayType} onChange={(e) => setEmpPayType(e.target.value)}>
                <option value="Salary">Salary</option>
                <option value="Hourly">Hourly</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pay Rate ({empPayType === "Salary" ? "Annual" : "Hourly"})</label>
              <Input type="number" value={empPayRate} onChange={(e) => setEmpPayRate(e.target.value)} placeholder="0.00" required />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsEmpModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Employee
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isRunModalOpen} onClose={() => setIsRunModalOpen(false)} title="Process Payroll">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Period Start</label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Period End</label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Hourly Employee Hours</h4>
            {employees.filter(e => e.payType === "Hourly").map(emp => (
              <div key={emp.id} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{emp.name}</span>
                <Input 
                  type="number" 
                  className="w-24" 
                  value={hourlyInputs[emp.id] || ""} 
                  onChange={(e) => setHourlyInputs({...hourlyInputs, [emp.id]: parseFloat(e.target.value)})}
                  placeholder="160"
                />
              </div>
            ))}
            {employees.filter(e => e.payType === "Hourly").length === 0 && (
              <p className="text-xs text-slate-400 italic">No hourly employees.</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsRunModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRunPayroll} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
              Confirm & Process
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
