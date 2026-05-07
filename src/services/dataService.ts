import { supabase, supabaseNew } from "../lib/supabase";
import {
  DailyStats,
  Claim,
  OperationLog,
  FakeOrder,
  CargoDamage,
} from "../types";

export const mapOperationLog = (row: Record<string, any>): OperationLog => {
  let skuVal = row.sku || "";
  let descriptionVal = row.description || row.details || "";
  let actionTypeVal: OperationLog["actionType"] = row.action_type || "Price";

  if (
    row.details &&
    typeof row.details === "string" &&
    row.details.startsWith("{")
  ) {
    try {
      const parsed = JSON.parse(row.details);
      if (!skuVal && parsed.sku) skuVal = parsed.sku;
      if (parsed.actionType) actionTypeVal = parsed.actionType;
      if (parsed.description) descriptionVal = parsed.description;
    } catch (e) {
      console.error("Error parsing log details:", e);
    }
  }

  if (row.action_type) actionTypeVal = row.action_type;

  return {
    id: row.id,
    date: row.date,
    sku: skuVal,
    action: row.action,
    createdAt: row.created_at,
    actionType: actionTypeVal,
    description: descriptionVal,
  };
};

export const dataService = {
  async fetchDailyStats(): Promise<DailyStats[]> {
    const { data, error } = await supabase
      .from("daily_stats")
      .select("*")
      .order("date", { ascending: true })
      .limit(30);

    if (error) throw new Error(error.message);

    return (data || []).map((row: Record<string, any>) => ({
      date: row.date,
      totalSales: row.total_sales || 0,
      totalOrders: row.total_orders || 0,
      adSpend: row.ad_spend || 0,
      exchangeRate: row.exchange_rate || 0.35,
      questions: row.questions || 0,
      claims: row.claims || 0,
      reputation: row.reputation || "绿色店铺",
      calculatedProfit: row.calculated_profit,
    }));
  },

  async fetchClaims(): Promise<Claim[]> {
    const { data, error } = await supabase
      .from("claims")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    return (data || []).map((row: Record<string, any>) => ({
      id: row.id,
      orderId: row.order_number || "",
      request: row.reason?.split("|")[0] || "",
      productName: row.product_name || "",
      handlingMethod: row.reason?.split("|")[1]?.trim().split("@")[0] || "",
      handlingTime: row.reason?.split("@")[1]?.trim() || "",
      createdAt: row.created_at,
      status: row.status,
    }));
  },

  async fetchOperationLogs(): Promise<OperationLog[]> {
    const { data, error } = await supabase
      .from("operation_logs")
      .select("*")
      .order("date", { ascending: false })
      .limit(500);

    if (error) throw new Error(error.message);
    return (data || []).map(mapOperationLog);
  },

  async fetchFakeOrders(): Promise<FakeOrder[]> {
    const { data, error } = await supabaseNew
      .from("fake_orders")
      .select(
        "*, reviewFeeCNY:review_fee_cny, refundAmountUSD:refund_amount_usd, skuName:sku_name",
      )
      .order("date", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as unknown as FakeOrder[];
  },

  async fetchCargoDamage(): Promise<CargoDamage[]> {
    const { data, error } = await supabase
      .from("cargo_damage")
      .select("*, skuName:sku_name, skuValueCNY:sku_value_cny")
      .order("date", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as unknown as CargoDamage[];
  },

  async deleteClaim(id: string): Promise<void> {
    const { error } = await supabase.from("claims").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async updateReputation(newReputation: string): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("daily_stats")
      .upsert(
        { date: today, reputation: newReputation },
        { onConflict: "date" },
      );
    if (error) throw new Error(error.message);
  },
};
