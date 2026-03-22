import React from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import { Button, Card } from "../components/ui";
import { Building2, LogIn } from "lucide-react";

export const LoginPage = () => {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center space-y-8">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 mx-auto">
          <Building2 className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">LeanBooks</h1>
          <p className="text-slate-500 mt-2 font-medium">Small business accounting made simple.</p>
        </div>
        <Button onClick={handleLogin} className="w-full py-4 text-lg font-bold" size="lg">
          <LogIn className="w-5 h-5 mr-3" />
          Sign in with Google
        </Button>
        <p className="text-xs text-slate-400 font-medium">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </Card>
    </div>
  );
};
