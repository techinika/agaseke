"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { t } from "@/lib/i18n";
import {
  fetchCreatorHomeData,
  type CreatorHomeData,
  type CreatorHomeStats,
} from "../api";
import type { CreatorHomeSupport } from "../types";

export function useCreatorHome() {
  const { creator } = useAuth();
  const [data, setData] = useState<CreatorHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHomeData = useCallback(async () => {
    if (!creator) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCreatorHomeData(creator);
      setData(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("creatorHome.loadError"));
    } finally {
      setLoading(false);
    }
  }, [creator]);

  /* eslint-disable react-hooks/set-state-in-effect -- initial Firebase fetch happens after mount */
  useEffect(() => {
    void fetchHomeData();
  }, [fetchHomeData]);

  const stats: CreatorHomeStats | null = data?.stats ?? null;
  const supports: CreatorHomeSupport[] = data?.supports ?? [];

  return { creator, stats, supports, loading, error, refetch: fetchHomeData };
}
