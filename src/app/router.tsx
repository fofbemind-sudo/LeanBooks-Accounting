import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAppContext } from "./providers";
import { Layout } from "../components/layout/Layout";
import { DashboardPage } from "../pages/DashboardPage";
import { TransactionsPage } from "../pages/TransactionsPage";
import { ReportsPage } from "../pages/ReportsPage";
import { PayrollPage } from "../pages/PayrollPage";
import { ContactsPage } from "../pages/ContactsPage";
import { InvoicesPage } from "../pages/InvoicesPage";
import { BillsPage } from "../pages/BillsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { LoginPage } from "../pages/LoginPage";
import { Loader2 } from "lucide-react";

export const AppRouter = () => {
  const { user, loading, business } = useAppContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/bills" element={<BillsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};
