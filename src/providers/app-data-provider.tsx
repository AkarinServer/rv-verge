import { createContext, useContext, ReactNode } from "react";

interface AppDataContextType {
  // Placeholder - will be implemented later
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return context;
};

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const value: AppDataContextType = {};

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
};

