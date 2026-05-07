import { useEffect } from "react";
import { useAppStore } from "../stores/appStore";
import { supabase, supabaseNew } from "../lib/supabase";

export function useRealtimeSubscriptions() {
  const fetchSkuData = useAppStore((s) => s.fetchSkuData);
  const fetchDailyData = useAppStore((s) => s.fetchDailyData);
  const fetchClaims = useAppStore((s) => s.fetchClaims);
  const fetchOperationLogs = useAppStore((s) => s.fetchOperationLogs);
  const fetchExpenses = useAppStore((s) => s.fetchExpenses);

  useEffect(() => {
    const channels = [
      supabase
        .channel("rt-sku-images")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sku_images" },
          () => fetchSkuData(),
        )
        .subscribe(),
      supabase
        .channel("rt-daily-stats")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "daily_stats" },
          () => fetchDailyData(),
        )
        .subscribe(),
      supabase
        .channel("rt-claims")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "claims" },
          () => fetchClaims(),
        )
        .subscribe(),
      supabase
        .channel("rt-operation-logs")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "operation_logs" },
          () => fetchOperationLogs(),
        )
        .subscribe(),
      supabaseNew
        .channel("rt-fake-orders")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "fake_orders" },
          () => fetchExpenses(),
        )
        .subscribe(),
      supabaseNew
        .channel("rt-cargo-damage")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "cargo_damage" },
          () => fetchExpenses(),
        )
        .subscribe(),
    ];

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [
    fetchSkuData,
    fetchDailyData,
    fetchClaims,
    fetchOperationLogs,
    fetchExpenses,
  ]);
}
