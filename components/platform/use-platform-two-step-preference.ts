"use client";

import { useCallback, useEffect, useState } from "react";
import { readPlatformTwoStepConfirm, writePlatformTwoStepConfirm } from "@/lib/platform-two-step";

export function usePlatformTwoStepPreference() {
  const [twoStepRequired, setTwoStepRequired] = useState(false);

  useEffect(() => {
    setTwoStepRequired(readPlatformTwoStepConfirm());
  }, []);

  const setTwoStepRequiredPersisted = useCallback((on: boolean) => {
    writePlatformTwoStepConfirm(on);
    setTwoStepRequired(on);
  }, []);

  return { twoStepRequired, setTwoStepRequiredPersisted };
}
