import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAppContext } from "./providers";
import { Layout } from "../components/layout/Layout";
import { LoadingSpinner } from "../components/ui";

// Lazy load pages
const DashboardPage = lazy(() => import("../pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const TransactionsPage = lazy(() => import("../pages/TransactionsPage").then(m => ({ default: m.TransactionsPage })));
const ReportsPage = lazy(() => import("../pages/ReportsPage").then(m => ({ default: m.ReportsPage })));
const PayrollPage = lazy(() => import("../pages/PayrollPage").then(m => ({ default: m.PayrollPage })));
const SettingsPage = lazy(() => import("../pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const LoginPage = lazy(() => import("../pages/LoginPage").then(m => ({ default: m.LoginPage })));

export const AppRouter = () => {
  const { user, loading, business } = useAppContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <LoadingSpinner size="lg" />
          </div>
        }>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </Router>
    );
  }

  return (
    <Router>
      <Layout>
        <Suspense fallback={
          <div className="min-h-[400px] flex items-center justify-center">
            <LoadingSpinner />
          </div>
        }>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/payroll" element={<PayrollPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
};
