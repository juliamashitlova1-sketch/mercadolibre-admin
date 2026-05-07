import React, { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Download,
  Calendar,
  Filter,
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Target,
  Loader2,
  PieChart,
  Activity,
  Layers,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from "recharts";
import { supabase, supabaseNew } from "../lib/supabase";
import { MXN_TO_CNY, USD_TO_MXN } from "../constants";
import { calculateSkuProfitMetrics } from "../utils/calculator";

const REPORT_TYPES = [
  { id: "sales", label: "销售分析报表", icon: TrendingUp, color: "sky" },
  { id: "profit", label: "利润核算报表", icon: DollarSign, color: "emerald" },
  { id: "inventory", label: "库存健康报表", icon: Package, color: "amber" },
  { id: "ads", label: "广告效果报表", icon: Target, color: "indigo" },
  { id: "comprehensive", label: "综合经营报表", icon: Layers, color: "purple" },
] as const;

const COLORS = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#6366f1",
  "#ec4899",
  "#f97316",
  "#14b8a6",
];

export default function ReportCenter() {
  const [loading, setLoading] = useState(true);
  const [skus, setSkus] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [adsData, setAdsData] = useState<any[]>([]);
  const [visitsData, setVisitsData] = useState<any[]>([]);
  const [fakeOrders, setFakeOrders] = useState<any[]>([]);
  const [cargoDamage, setCargoDamage] = useState<any[]>([]);
  const [pricingData, setPricingData] = useState<any[]>([]);

  const [reportType, setReportType] = useState<string>("sales");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        skuRes,
        ordersRes,
        adsRes,
        visitsRes,
        fakeRes,
        damageRes,
        pricingRes,
      ] = await Promise.all([
        supabase.from("skus").select("*").order("sku", { ascending: true }),
        supabase.from("cleaned_orders").select("*"),
        supabase.from("sku_ads").select("*"),
        supabase.from("sku_visits").select("*"),
        supabaseNew.from("fake_orders").select("*"),
        supabaseNew.from("cargo_damage").select("*"),
        supabase.from("sku_pricing").select("*"),
      ]);

      setSkus(skuRes.data || []);
      setOrders(ordersRes.data || []);
      setAdsData(adsRes.data || []);
      setVisitsData(visitsRes.data || []);
      setFakeOrders(fakeRes.data || []);
      setCargoDamage(damageRes.data || []);
      setPricingData(pricingRes.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const skuList = useMemo(() => {
    return skus.map((s) => s.sku).filter(Boolean);
  }, [skus]);

  const filteredOrders = useMemo(() => {
    let data = orders.filter((o) => o.status === "valid");
    if (selectedSkus.length > 0) {
      data = data.filter((o) => selectedSkus.includes(o.sku));
    }
    if (dateRange.start) {
      data = data.filter((o) => o.order_date >= dateRange.start);
    }
    if (dateRange.end) {
      data = data.filter((o) => o.order_date <= dateRange.end);
    }
    return data;
  }, [orders, selectedSkus, dateRange]);

  const filteredAds = useMemo(() => {
    let data = adsData;
    if (selectedSkus.length > 0) {
      data = data.filter((a) => selectedSkus.includes(a.sku));
    }
    if (dateRange.start) {
      data = data.filter((a) => a.date >= dateRange.start);
    }
    if (dateRange.end) {
      data = data.filter((a) => a.date <= dateRange.end);
    }
    return data;
  }, [adsData, selectedSkus, dateRange]);

  const skuPriceMap = useMemo(() => {
    const map: Record<string, number> = {};
    skus.forEach((s) => {
      if (s.sku && s.price_mxn) {
        map[s.sku] = Number(s.price_mxn) || 0;
      }
    });
    return map;
  }, [skus]);

  const pricingMap = useMemo(() => {
    const map: Record<string, any> = {};
    pricingData.forEach((p) => {
      if (p.sku) map[p.sku.toUpperCase()] = p;
    });
    return map;
  }, [pricingData]);

  const salesReport = useMemo(() => {
    const dailyMap: Record<
      string,
      { date: string; sales: number; orders: number; units: number }
    > = {};
    filteredOrders.forEach((o) => {
      const date = o.order_date;
      if (!dailyMap[date])
        dailyMap[date] = { date, sales: 0, orders: 0, units: 0 };
      const price = skuPriceMap[o.sku] || 0;
      dailyMap[date].sales += price * (o.units || 1);
      dailyMap[date].orders += 1;
      dailyMap[date].units += o.units || 1;
    });
    return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOrders, skuPriceMap]);

  const profitReport = useMemo(() => {
    const dailyMap: Record<
      string,
      {
        date: string;
        grossProfit: number;
        adSpend: number;
        fakeCost: number;
        damageCost: number;
        netProfit: number;
      }
    > = {};

    filteredOrders.forEach((o) => {
      const date = o.order_date;
      const sku = o.sku?.toUpperCase();
      if (!dailyMap[date])
        dailyMap[date] = {
          date,
          grossProfit: 0,
          adSpend: 0,
          fakeCost: 0,
          damageCost: 0,
          netProfit: 0,
        };

      const p = pricingMap[sku];
      if (p) {
        const sellingPrice = Number(p.selling_price_mxn) || 0;
        const purchasePrice = Number(p.purchase_price_cny) || 0;
        const exchangeRate = Number(p.exchange_rate) || 0.38;
        const commissionRate = Number(p.commission_rate) || 0;
        const units = o.units || 1;
        const revenueCny = sellingPrice * exchangeRate * units;
        const costCny = purchasePrice * units;
        const commission = revenueCny * commissionRate;
        dailyMap[date].grossProfit += revenueCny - costCny - commission;
      }
    });

    filteredAds.forEach((a) => {
      const date = a.date;
      if (!dailyMap[date])
        dailyMap[date] = {
          date,
          grossProfit: 0,
          adSpend: 0,
          fakeCost: 0,
          damageCost: 0,
          netProfit: 0,
        };
      dailyMap[date].adSpend +=
        (parseFloat(a.ad_spend) || 0) * USD_TO_MXN * MXN_TO_CNY;
    });

    fakeOrders.forEach((f) => {
      const date = f.date;
      if (dailyMap[date]) {
        const cost =
          Number(f.review_fee_cny || 0) -
          Number(f.refund_amount_usd || 0) * USD_TO_MXN * MXN_TO_CNY +
          Number(f.unit_cost_cny || 0);
        dailyMap[date].fakeCost += cost;
      }
    });

    cargoDamage.forEach((c) => {
      const date = c.date;
      if (dailyMap[date]) {
        dailyMap[date].damageCost +=
          Number(c.quantity || 0) * Number(c.sku_value_cny || 0);
      }
    });

    Object.values(dailyMap).forEach((d) => {
      d.netProfit = d.grossProfit - d.adSpend - d.fakeCost - d.damageCost;
    });

    return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOrders, filteredAds, fakeOrders, cargoDamage, pricingMap]);

  const inventoryReport = useMemo(() => {
    const today = new Date();
    return skus
      .filter((s) => s.sku && s.sku !== "A15")
      .filter((s) => selectedSkus.length === 0 || selectedSkus.includes(s.sku))
      .map((s) => {
        const allOrders = orders.filter(
          (o) => o.sku === s.sku && o.status === "valid",
        );
        const totalUnits = allOrders.reduce(
          (acc, o) => acc + (o.units || 1),
          0,
        );

        // 计算上架天数
        let listedDays = 30;
        if (s.listed_date) {
          const listedDate = new Date(s.listed_date);
          if (!isNaN(listedDate.getTime())) {
            listedDays = Math.max(
              1,
              Math.ceil(
                (today.getTime() - listedDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            );
          }
        }

        const avgDaily = totalUnits / listedDays;
        const stock = parseInt(s.inventory) || 0;
        const days = avgDaily > 0 ? Math.floor(stock / avgDaily) : 999;
        const status =
          stock === 0
            ? "缺货"
            : days < 60
              ? "紧急"
              : days < 90
                ? "偏低"
                : "正常";
        return {
          sku: s.sku,
          skuName: s.product_name || s.name || "",
          stock,
          inTransit: parseInt(s.replenish_inventory) || 0,
          inProduction: 0,
          avgDaily: Number(avgDaily.toFixed(2)),
          daysOfStock: days,
          status,
        };
      })
      .sort((a, b) => a.daysOfStock - b.daysOfStock);
  }, [skus, orders, selectedSkus]);

  const adsReport = useMemo(() => {
    const dailyMap: Record<
      string,
      {
        date: string;
        spend: number;
        impressions: number;
        clicks: number;
        adOrders: number;
        adSales: number;
      }
    > = {};
    filteredAds.forEach((a) => {
      const date = a.date;
      if (!dailyMap[date])
        dailyMap[date] = {
          date,
          spend: 0,
          impressions: 0,
          clicks: 0,
          adOrders: 0,
          adSales: 0,
        };
      dailyMap[date].spend += parseFloat(a.ad_spend) || 0;
      dailyMap[date].impressions += parseInt(a.impressions) || 0;
      dailyMap[date].clicks += parseInt(a.clicks) || 0;
      dailyMap[date].adOrders += parseInt(a.ad_orders) || 0;
      const price = skuPriceMap[a.sku] || 0;
      dailyMap[date].adSales += price * (parseInt(a.ad_orders) || 0);
    });
    return Object.values(dailyMap)
      .map((d) => ({
        ...d,
        ctr:
          d.impressions > 0
            ? Number(((d.clicks / d.impressions) * 100).toFixed(2))
            : 0,
        cvr:
          d.clicks > 0 ? Number(((d.adOrders / d.clicks) * 100).toFixed(2)) : 0,
        acos:
          d.adSales > 0 ? Number(((d.spend / d.adSales) * 100).toFixed(1)) : 0,
        roas: d.spend > 0 ? Number((d.adSales / d.spend).toFixed(2)) : 0,
        cpc: d.clicks > 0 ? Number((d.spend / d.clicks).toFixed(2)) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredAds, skuPriceMap]);

  const skuPerformanceRanking = useMemo(() => {
    const skuMap: Record<
      string,
      {
        sku: string;
        name: string;
        sales: number;
        orders: number;
        adSpend: number;
        profit: number;
      }
    > = {};

    filteredOrders.forEach((o) => {
      const sku = o.sku;
      if (!sku) return;
      if (!skuMap[sku]) {
        const skuInfo = skus.find((s) => s.sku === sku);
        skuMap[sku] = {
          sku,
          name: skuInfo?.product_name || skuInfo?.name || "",
          sales: 0,
          orders: 0,
          adSpend: 0,
          profit: 0,
        };
      }
      const price = skuPriceMap[sku] || 0;
      skuMap[sku].sales += price * (o.units || 1);
      skuMap[sku].orders += o.units || 1;

      const p = pricingMap[sku?.toUpperCase()];
      if (p) {
        const units = o.units || 1;
        const m = calculateSkuProfitMetrics({
          purchasePriceCny: p.purchase_price_cny || 0,
          sellingPriceMxn: p.selling_price_mxn || 0,
          exchangeRate: p.exchange_rate || 0.38,
          commissionRate: p.commission_rate || 0,
          adRate: p.ad_rate || 0,
          returnRate: p.return_rate || 0,
          taxRate: p.tax_rate || 0,
          boxLength: p.box_length || 0,
          boxWidth: p.box_width || 0,
          boxHeight: p.box_height || 0,
          boxWeight: p.box_weight || 0,
          packCount: p.pack_count || 1,
          boxCount: 1,
          unitLength: p.unit_length || 0,
          unitWidth: p.unit_width || 0,
          unitHeight: p.unit_height || 0,
          productWeight: p.product_weight || 0,
          logisticsMode: p.logistics_mode || "海运",
          seaFreightUnitPrice: p.sea_freight_unit_price || 0,
          airFreightUnitPrice: p.air_freight_unit_price || 0,
        });
        skuMap[sku].profit += m.unitProfitCny * units;
      }
    });

    filteredAds.forEach((a) => {
      const sku = a.sku;
      if (!sku || !skuMap[sku]) return;
      const spendCny = (parseFloat(a.ad_spend) || 0) * USD_TO_MXN * MXN_TO_CNY;
      skuMap[sku].adSpend += spendCny;
      skuMap[sku].profit -= spendCny;
    });

    // 扣除刷单和货损成本
    fakeOrders.forEach((f) => {
      const sku = f.sku?.toUpperCase();
      if (sku && skuMap[sku]) {
        const cost =
          Number(f.review_fee_cny || 0) -
          Number(f.refund_amount_usd || 0) * USD_TO_MXN * MXN_TO_CNY +
          Number(f.unit_cost_cny || 0);
        skuMap[sku].profit -= cost;
      }
    });

    cargoDamage.forEach((c) => {
      const sku = c.sku?.toUpperCase();
      if (sku && skuMap[sku]) {
        skuMap[sku].profit -=
          Number(c.quantity || 0) * Number(c.sku_value_cny || 0);
      }
    });

    return Object.values(skuMap).sort((a, b) => b.profit - a.profit);
  }, [
    filteredOrders,
    filteredAds,
    skus,
    skuPriceMap,
    pricingMap,
    fakeOrders,
    cargoDamage,
  ]);

  const handleExportCSV = () => {
    let csvContent = "";
    let headers: string[] = [];
    let rows: string[][] = [];

    if (reportType === "sales") {
      headers = ["日期", "销售额(MXN)", "订单数", "销量(件)"];
      rows = salesReport.map((r) => [
        r.date,
        r.sales.toFixed(2),
        String(r.orders),
        String(r.units),
      ]);
    } else if (reportType === "profit") {
      headers = [
        "日期",
        "毛利(CNY)",
        "广告支出(CNY)",
        "刷单成本(CNY)",
        "货损(CNY)",
        "净利润(CNY)",
      ];
      rows = profitReport.map((r) => [
        r.date,
        r.grossProfit.toFixed(2),
        r.adSpend.toFixed(2),
        r.fakeCost.toFixed(2),
        r.damageCost.toFixed(2),
        r.netProfit.toFixed(2),
      ]);
    } else if (reportType === "inventory") {
      headers = ["SKU", "名称", "库存", "在途", "日均销量", "可售天数", "状态"];
      rows = inventoryReport.map((r) => [
        r.sku,
        r.skuName,
        String(r.stock),
        String(r.inTransit),
        r.avgDaily.toFixed(2),
        String(r.daysOfStock),
        r.status,
      ]);
    } else if (reportType === "ads") {
      headers = [
        "日期",
        "广告费(USD)",
        "曝光",
        "点击",
        "广告订单",
        "CTR%",
        "CVR%",
        "ACOS%",
        "ROAS",
        "CPC",
      ];
      rows = adsReport.map((r) => [
        r.date,
        r.spend.toFixed(2),
        String(r.impressions),
        String(r.clicks),
        String(r.adOrders),
        String(r.ctr),
        String(r.cvr),
        String(r.acos),
        String(r.roas),
        r.cpc.toFixed(2),
      ]);
    }

    csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${REPORT_TYPES.find((t) => t.id === reportType)?.label || "报表"}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderChart = () => {
    switch (reportType) {
      case "sales":
        return (
          <div className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={salesReport}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="date"
                    fontSize={9}
                    tickFormatter={(d) => d.slice(5)}
                  />
                  <YAxis yAxisId="left" fontSize={9} />
                  <YAxis yAxisId="right" orientation="right" fontSize={9} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="orders"
                    name="订单数"
                    fill="#0ea5e9"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="sales"
                    name="销售额(MXN)"
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
                <div className="text-[10px] font-bold text-sky-400 uppercase">
                  总销售额
                </div>
                <div className="text-lg font-black text-sky-700">
                  $
                  {salesReport
                    .reduce((a, r) => a + r.sales, 0)
                    .toLocaleString()}
                </div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <div className="text-[10px] font-bold text-emerald-400 uppercase">
                  总订单数
                </div>
                <div className="text-lg font-black text-emerald-700">
                  {salesReport.reduce((a, r) => a + r.orders, 0)}
                </div>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <div className="text-[10px] font-bold text-amber-400 uppercase">
                  日均销售额
                </div>
                <div className="text-lg font-black text-amber-700">
                  $
                  {salesReport.length > 0
                    ? (
                        salesReport.reduce((a, r) => a + r.sales, 0) /
                        salesReport.length
                      ).toFixed(0)
                    : 0}
                </div>
              </div>
            </div>
          </div>
        );

      case "profit":
        return (
          <div className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={profitReport}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="date"
                    fontSize={9}
                    tickFormatter={(d) => d.slice(5)}
                  />
                  <YAxis fontSize={9} />
                  <Tooltip formatter={(v: number) => `¥${v.toFixed(2)}`} />
                  <Legend />
                  <Bar
                    dataKey="grossProfit"
                    name="毛利"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="fakeCost"
                    name="刷单成本"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="netProfit"
                    name="净利润"
                    stroke="#0ea5e9"
                    strokeWidth={3}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <div className="text-[10px] font-bold text-emerald-400 uppercase">
                  总毛利
                </div>
                <div className="text-lg font-black text-emerald-700">
                  ¥
                  {profitReport
                    .reduce((a, r) => a + r.grossProfit, 0)
                    .toFixed(0)}
                </div>
              </div>
              <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                <div className="text-[10px] font-bold text-rose-400 uppercase">
                  广告支出
                </div>
                <div className="text-lg font-black text-rose-700">
                  ¥{profitReport.reduce((a, r) => a + r.adSpend, 0).toFixed(0)}
                </div>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <div className="text-[10px] font-bold text-orange-400 uppercase">
                  刷单+货损
                </div>
                <div className="text-lg font-black text-orange-700">
                  ¥
                  {profitReport
                    .reduce((a, r) => a + r.fakeCost + r.damageCost, 0)
                    .toFixed(0)}
                </div>
              </div>
              <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
                <div className="text-[10px] font-bold text-sky-400 uppercase">
                  净利润
                </div>
                <div className="text-lg font-black text-sky-700">
                  ¥
                  {profitReport.reduce((a, r) => a + r.netProfit, 0).toFixed(0)}
                </div>
              </div>
            </div>
          </div>
        );

      case "inventory":
        return (
          <div className="space-y-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryReport.slice(0, 15)}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis dataKey="sku" fontSize={9} />
                  <YAxis fontSize={9} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="stock"
                    name="当前库存"
                    fill="#0ea5e9"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="inTransit"
                    name="在途库存"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 font-bold text-slate-400">
                      SKU
                    </th>
                    <th className="text-left py-2 px-3 font-bold text-slate-400">
                      名称
                    </th>
                    <th className="text-right py-2 px-3 font-bold text-slate-400">
                      库存
                    </th>
                    <th className="text-right py-2 px-3 font-bold text-slate-400">
                      可售天数
                    </th>
                    <th className="text-center py-2 px-3 font-bold text-slate-400">
                      状态
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryReport.map((r) => (
                    <tr
                      key={r.sku}
                      className="border-b border-slate-50 hover:bg-slate-50"
                    >
                      <td className="py-2 px-3 font-bold">{r.sku}</td>
                      <td className="py-2 px-3 text-slate-500">{r.skuName}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {r.stock}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {r.daysOfStock === 999 ? "∞" : r.daysOfStock}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            r.daysOfStock >= 90
                              ? "bg-emerald-100 text-emerald-600"
                              : r.daysOfStock >= 60
                                ? "bg-amber-100 text-amber-600"
                                : "bg-red-100 text-red-600"
                          }`}
                        >
                          {r.daysOfStock >= 90
                            ? "健康"
                            : r.daysOfStock >= 60
                              ? "偏低"
                              : "紧急"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "ads":
        return (
          <div className="space-y-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={adsReport}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="date"
                    fontSize={9}
                    tickFormatter={(d) => d.slice(5)}
                  />
                  <YAxis yAxisId="left" fontSize={9} />
                  <YAxis yAxisId="right" orientation="right" fontSize={9} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="spend"
                    name="广告费(USD)"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="acos"
                    name="ACOS%"
                    stroke="#ef4444"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="roas"
                    name="ROAS"
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-5 gap-3">
              <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                <div className="text-[9px] font-bold text-indigo-400 uppercase">
                  总广告费
                </div>
                <div className="text-sm font-black text-indigo-700">
                  ${adsReport.reduce((a, r) => a + r.spend, 0).toFixed(0)}
                </div>
              </div>
              <div className="bg-sky-50 rounded-xl p-3 border border-sky-100">
                <div className="text-[9px] font-bold text-sky-400 uppercase">
                  总曝光
                </div>
                <div className="text-sm font-black text-sky-700">
                  {adsReport
                    .reduce((a, r) => a + r.impressions, 0)
                    .toLocaleString()}
                </div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                <div className="text-[9px] font-bold text-emerald-400 uppercase">
                  平均CTR
                </div>
                <div className="text-sm font-black text-emerald-700">
                  {adsReport.length > 0
                    ? (
                        adsReport.reduce((a, r) => a + r.ctr, 0) /
                        adsReport.length
                      ).toFixed(2)
                    : 0}
                  %
                </div>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <div className="text-[9px] font-bold text-amber-400 uppercase">
                  平均ACOS
                </div>
                <div className="text-sm font-black text-amber-700">
                  {adsReport.length > 0
                    ? (
                        adsReport.reduce((a, r) => a + r.acos, 0) /
                        adsReport.length
                      ).toFixed(1)
                    : 0}
                  %
                </div>
              </div>
              <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
                <div className="text-[9px] font-bold text-rose-400 uppercase">
                  平均CPC
                </div>
                <div className="text-sm font-black text-rose-700">
                  $
                  {adsReport.length > 0
                    ? (
                        adsReport.reduce((a, r) => a + r.cpc, 0) /
                        adsReport.length
                      ).toFixed(2)
                    : 0}
                </div>
              </div>
            </div>
          </div>
        );

      case "comprehensive":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-[250px] bg-white rounded-xl border border-slate-100 p-4">
                <h4 className="text-[10px] font-bold text-slate-500 mb-2">
                  SKU利润排名 TOP 10
                </h4>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart
                    data={skuPerformanceRanking.slice(0, 10)}
                    layout="vertical"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis type="number" fontSize={9} />
                    <YAxis
                      type="category"
                      dataKey="sku"
                      fontSize={9}
                      width={60}
                    />
                    <Tooltip formatter={(v: number) => `¥${v.toFixed(2)}`} />
                    <Bar
                      dataKey="profit"
                      name="净利润(CNY)"
                      fill="#0ea5e9"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[250px] bg-white rounded-xl border border-slate-100 p-4">
                <h4 className="text-[10px] font-bold text-slate-500 mb-2">
                  SKU销量占比
                </h4>
                <ResponsiveContainer width="100%" height="90%">
                  <RePieChart>
                    <Pie
                      data={skuPerformanceRanking.slice(0, 8)}
                      dataKey="orders"
                      nameKey="sku"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {skuPerformanceRanking.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend fontSize={9} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 font-bold text-slate-400">
                      #
                    </th>
                    <th className="text-left py-2 px-3 font-bold text-slate-400">
                      SKU
                    </th>
                    <th className="text-left py-2 px-3 font-bold text-slate-400">
                      名称
                    </th>
                    <th className="text-right py-2 px-3 font-bold text-slate-400">
                      销售额(MXN)
                    </th>
                    <th className="text-right py-2 px-3 font-bold text-slate-400">
                      订单数
                    </th>
                    <th className="text-right py-2 px-3 font-bold text-slate-400">
                      广告费(CNY)
                    </th>
                    <th className="text-right py-2 px-3 font-bold text-slate-400">
                      净利润(CNY)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {skuPerformanceRanking.map((r, i) => (
                    <tr
                      key={r.sku}
                      className="border-b border-slate-50 hover:bg-slate-50"
                    >
                      <td className="py-2 px-3">
                        <span
                          className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black ${i < 3 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold">{r.sku}</td>
                      <td className="py-2 px-3 text-slate-500">{r.name}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        ${r.sales.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {r.orders}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        ¥{r.adSpend.toFixed(0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-sky-600">
                        ¥{r.profit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="v2-page-container bg-slate-50/50">
      <div className="v2-inner-container space-y-4">
        <header className="flex justify-between items-center py-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 leading-tight">
                智能报表中心
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Smart Report Generator
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 hover:border-sky-300 hover:text-sky-600 transition-all flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" /> 导出 CSV
            </button>
          </div>
        </header>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {REPORT_TYPES.map((t) => {
            const Icon = t.icon;
            const isActive = reportType === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setReportType(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? `bg-${t.color}-500/10 text-${t.color}-600 border border-${t.color}-500/30 shadow-sm`
                    : "bg-white text-slate-400 border border-slate-100 hover:border-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start: e.target.value }))
              }
              className="text-[11px] text-slate-600 outline-none bg-transparent"
            />
            <span className="text-slate-300">~</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end: e.target.value }))
              }
              className="text-[11px] text-slate-600 outline-none bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSkus.join(",")}
              onChange={(e) =>
                setSelectedSkus(e.target.value ? e.target.value.split(",") : [])
              }
              className="text-[11px] text-slate-600 outline-none bg-transparent"
            >
              <option value="">全部 SKU</option>
              {skuList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {(dateRange.start || dateRange.end || selectedSkus.length > 0) && (
            <button
              onClick={() => {
                setDateRange({ start: "", end: "" });
                setSelectedSkus([]);
              }}
              className="text-[10px] text-sky-500 font-bold hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> 重置筛选
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          {renderChart()}
        </div>
      </div>
    </div>
  );
}
