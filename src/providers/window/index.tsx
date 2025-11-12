import React, { createContext, useContext, ReactNode } from "react";

interface WindowContextType {
  // Placeholder - will be implemented later
}

const WindowContext = createContext<WindowContextType | undefined>(undefined);

export const useWindow = () => {
  const context = useContext(WindowContext);
  if (!context) {
    throw new Error("useWindow must be used within WindowProvider");
  }
  return context;
};

export const WindowProvider = ({ children }: { children: ReactNode }) => {
  const value: WindowContextType = {};

  return (
    <WindowContext.Provider value={value}>{children}</WindowContext.Provider>
  );
};

