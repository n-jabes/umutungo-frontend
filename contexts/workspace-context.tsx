"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Workspace = "rental" | "portfolio";

type WorkspaceContextValue = {
  workspace: Workspace;
  setWorkspace: (workspace: Workspace) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const WORKSPACE_KEY = "umutungo:workspace";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>("rental");

  useEffect(() => {
    const stored = localStorage.getItem(WORKSPACE_KEY);
    if (stored === "rental" || stored === "portfolio") {
      setWorkspace(stored);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(WORKSPACE_KEY, workspace);
  }, [workspace]);

  const value = useMemo(() => ({ workspace, setWorkspace }), [workspace]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
