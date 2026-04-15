"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CursorMap = Record<number, string | undefined>;

export function useCursorPagination(resetKey: string) {
  const [page, setPage] = useState(1);
  const [cursorByPage, setCursorByPage] = useState<CursorMap>({ 1: undefined });

  useEffect(() => {
    setPage(1);
    setCursorByPage({ 1: undefined });
  }, [resetKey]);

  const cursor = useMemo(() => cursorByPage[page], [cursorByPage, page]);

  const goPrev = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const goNext = useCallback(
    (nextCursor?: string | null) => {
      if (!nextCursor) return;
      setCursorByPage((prev) => ({ ...prev, [page + 1]: nextCursor }));
      setPage((p) => p + 1);
    },
    [page],
  );

  return {
    page,
    cursor,
    canPrev: page > 1,
    goPrev,
    goNext,
  };
}
