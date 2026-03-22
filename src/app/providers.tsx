import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../firebase";
import { Business } from "../types";
import { collection, query, where, getDocs } from "firebase/firestore";
import { api } from "../api/client";

interface AppContextType {
  user: User | null;
  business: Business | null;
  loading: boolean;
  setBusiness: (b: Business | null) => void;
  refreshBusiness: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshBusiness = async () => {
    if (!user) return;
    try {
      const businesses = await api.getBusinesses();
      if (businesses.length > 0) {
        setBusiness(businesses[0]);
      } else {
        setBusiness(null);
      }
    } catch (error) {
      console.error("Error refreshing business:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch user's business
        try {
          const businesses = await api.getBusinesses();
          if (businesses.length > 0) {
            setBusiness(businesses[0]);
          }
        } catch (error) {
          console.error("Error fetching business:", error);
        }
      } else {
        setBusiness(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AppContext.Provider value={{ user, business, loading, setBusiness, refreshBusiness }}>
      {children}
    </AppContext.Provider>
  );
};
