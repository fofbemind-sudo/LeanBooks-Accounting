import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Receipt, 
  BarChart3, 
  Users, 
  Settings, 
  LogOut,
  Building2,
  Menu,
  X
} from "lucide-react";
import { cn } from "../ui";
import { useAppContext } from "../../app/providers";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { business, user } = useAppContext();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Receipt, label: "Transactions", path: "/transactions" },
    { icon: BarChart3, label: "Reports", path: "/reports" },
    { icon: Users, label: "Payroll", path: "/payroll" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 sticky top-0 h-screen">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-xl text-slate-900 tracking-tight">LeanBooks</h1>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Accounting MVP</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                location.pathname === item.path
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-slate-50 rounded-2xl p-4 mb-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Active Business</div>
            <div className="font-bold text-slate-900 truncate">{business?.name || "No Business Selected"}</div>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-indigo-600" />
          <span className="font-bold text-slate-900">LeanBooks</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover:bg-slate-100 rounded-lg">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-white pt-20 px-4 animate-in slide-in-from-top duration-300">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-4 rounded-xl font-bold text-lg",
                  location.pathname === item.path ? "bg-indigo-50 text-indigo-600" : "text-slate-600"
                )}
              >
                <item.icon className="w-6 h-6" />
                {item.label}
              </Link>
            ))}
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-4 rounded-xl font-bold text-lg text-rose-600 w-full"
            >
              <LogOut className="w-6 h-6" />
              Sign Out
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-10 pt-24 lg:pt-10 overflow-auto max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};
