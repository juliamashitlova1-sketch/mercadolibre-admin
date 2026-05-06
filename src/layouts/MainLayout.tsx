import React, { useState, useEffect, useMemo } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { SKUStats } from "../types";
import logo from "../assets/logo.png";
import { STOCK_HEALTH_THRESHOLD } from "../constants";
import {
  Database,
  Package,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  LayoutDashboard,
  DollarSign,
  AlertTriangle,
  Activity,
  Search,
  Bell,
  Settings,
  PlusCircle,
  Compass,
  Brain,
  Calculator,
  History,
  CheckCircle,
  Inbox,
  CreditCard,
  PackageX,
  MessageSquare,
  BarChart3,
  Star,
  X,
} from "lucide-react";
import appBg from "../assets/app-bg.png";

import { getMexicoTimeString } from "../lib/time";

import { supabase, supabaseNew } from "../lib/supabase";
import { motion, AnimatePresence } from "motion/react";

const MilyflyLogo = ({ className = "w-6 h-6" }) => (
  <svg
    viewBox="0 0 100 90"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M 28,45 C 8,10 40,-5 55,25 C 65,-5 98,10 70,45 C 95,50 95,80 75,80 L 40,80 M 12,48 L 22,48 L 27,78 L 48,78"
      fill="none"
      stroke="#DF5B18"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M 24,53 L 55,54 L 52,70 L 26,68 Z" fill="#5E174F" />
    <path
      d="M 34,53 L 32,69 M 45,54 L 43,70 M 25,60 L 53,61"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="28" cy="84" r="5" fill="#DF5B18" />
    <circle cx="45" cy="84" r="5" fill="#DF5B18" />
  </svg>
);

function CurrencyConverter() {
  const [base, setBase] = useState<"USD" | "MXN" | "CNY">("USD");
  const [val, setVal] = useState<string>("");

  const rates = {
    USD: { MXN: 19.85, CNY: 7.24 },
    MXN: { USD: 0.05, CNY: 0.365 },
    CNY: { USD: 0.138, MXN: 2.74 },
  };

  const calculate = (to: "USD" | "MXN" | "CNY") => {
    if (!val || isNaN(Number(val))) return "0.00";
    if (to === base) return Number(val).toFixed(2);
    // @ts-ignore
    return (Number(val) * (rates[base][to] || 1)).toFixed(2);
  };

  return (
    <div className="flex items-center gap-2 group/conv">
      <select
        value={base}
        onChange={(e) => setBase(e.target.value as any)}
        className="bg-transparent text-[10px] font-bold text-slate-500 outline-none cursor-pointer hover:text-sky-600 transition-colors"
      >
        <option value="USD">USD $</option>
        <option value="MXN">MXN $</option>
        <option value="CNY">CNY ¥</option>
      </select>
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="输入数值"
        className="w-16 bg-slate-50/50 text-[11px] font-mono font-bold text-slate-700 outline-none px-1.5 py-0.5 rounded border border-transparent focus:border-sky-200 transition-all placeholder:text-slate-300"
      />
      <div className="flex items-center gap-2 pr-1 opacity-60 group-hover/conv:opacity-100 transition-opacity">
        {["USD", "MXN", "CNY"]
          .filter((c) => c !== base)
          .map((c) => (
            <div key={c} className="flex items-center gap-1">
              <span className="text-[9px] font-medium text-slate-400 uppercase">
                {c}
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-600">
                {calculate(c as any)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

interface LayoutProps {
  skuData: SKUStats[];
  dailyData: any[];
  fakeOrders: any[];
  cargoDamage: any[];
  operationLogs: any[];
  uiVersion: "v2";
  onAddSku: () => void;
}

export default function MainLayout({
  skuData,
  dailyData,
  fakeOrders,
  cargoDamage,
  operationLogs,
  uiVersion,
  onAddSku,
}: LayoutProps) {
  const [currentTime, setCurrentTime] = useState(getMexicoTimeString());

  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getMexicoTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Notification system state
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [appUpdates, setAppUpdates] = useState<any[]>([]);
  const [hasNewUpdate, setHasNewUpdate] = useState(true);

  useEffect(() => {
    fetchAppUpdates();
  }, []);

  const fetchAppUpdates = async () => {
    try {
      const { data, error } = await supabaseNew
        .from("app_updates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const updates = data || [];
      setAppUpdates(updates);

      if (updates.length > 0) {
        const latestVersion = updates[0].version;
        const lastSeen = localStorage.getItem("milyfly_last_seen_version");
        if (lastSeen !== latestVersion) {
          setIsNotificationOpen(true);
          setHasNewUpdate(true);
        } else {
          setHasNewUpdate(false);
        }
      }
    } catch (err) {
      console.error("Error fetching updates:", err);
    }
  };

  const inventoryStatus =
    skuData && skuData.length > 0
      ? skuData.filter(
          (s) =>
            Math.floor(s.stock / (s.avgSalesSinceListing || 1)) <
            STOCK_HEALTH_THRESHOLD,
        ).length > 0
        ? "需补货"
        : "正常"
      : "空";

  const menuItems = [
    {
      id: "/data-dashboard",
      label: "数据大屏",
      icon: LayoutDashboard,
      color: "text-cyan-400",
    },
    {
      id: "/sku-cost-management",
      label: "SKU成本管理",
      icon: DollarSign,
      color: "text-amber-500",
    },
    { id: "/fake-orders", label: "刷单支出", icon: CreditCard },
    { id: "/cargo-damage", label: "货损支出", icon: PackageX },
    { isSeparator: true },
    { id: "/sku-management", label: "SKU数据总览", icon: Package },
    {
      id: "/data-cleaning",
      label: "数据清洗",
      icon: Database,
      children: [
        {
          id: "/data-cleaning/orders",
          label: "订单及销售数量",
          icon: ShoppingCart,
        },
        { id: "/data-cleaning/visits", label: "各SKU访问数据", icon: Search },
        {
          id: "/data-cleaning/ads",
          label: "各SKU每日广告数据",
          icon: TrendingUp,
        },
      ],
    },
    { id: "/operations", label: "运营动作", icon: Activity },
    { id: "/sku-reviews", label: "链接评价", icon: Star },
    { id: "/competitor-data", label: "竞品数据", icon: BarChart3 },
    { isSeparator: true },
    { id: "/health", label: "账号健康", icon: AlertTriangle },
    {
      id: "/pricing",
      label: "新品核价",
      icon: Calculator,
      color: "text-emerald-500",
      children: [
        { id: "/pricing/new", label: "待核价 (计算器)", icon: PlusCircle },
        { id: "/pricing/list", label: "已核价清单", icon: History },
        {
          id: "/pricing/success",
          label: "核价成功区",
          icon: CheckCircle,
          shadow: "shadow-[0_0_10px_rgba(16,185,129,0.2)]",
        },
        { id: "/pricing/staging", label: "暂存箱", icon: Inbox },
      ],
    },
    {
      id: "/software-suggestions",
      label: "软件迭代建议",
      icon: MessageSquare,
      color: "text-purple-500",
    },
    {
      id: "/data-sources",
      label: "数据来源",
      icon: Database,
    },
  ];

  // Stable random grid for DATA_STREAM card
  const streamGrid = useMemo(
    () =>
      Array.from({ length: 16 }).map((_, i) =>
        i % 3 === 0
          ? "rgba(56,189,248,0.2)"
          : i % 5 === 0
            ? "rgba(139,92,246,0.15)"
            : "rgba(255,255,255,0.03)",
      ),
    [],
  );

  return (
    <div
      className={`flex h-screen overflow-hidden selection:bg-sky-100 selection:text-sky-900 transition-colors duration-700 ${uiVersion === "v2" ? "theme-v2 bg-white text-slate-900" : "bg-transparent"}`}
    >
      {/* Full App Background Image (V2 Only) with Enhanced Light Feel */}
      {uiVersion === "v2" && (
        <>
          <div className="fixed inset-0 pointer-events-none z-0 bg-white" />
          {/* Subtle Ambient Glow */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="absolute -top-[10%] left-[20%] w-[60%] h-[50%] bg-sky-400/[0.08] blur-[140px] rounded-full animate-pulse-slow" />
            <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-indigo-400/[0.05] blur-[120px] rounded-full" />
          </div>

          <div
            className="fixed inset-0 pointer-events-none z-0"
            style={{
              backgroundImage: `url(${appBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.18,
              mixBlendMode: "multiply",
              filter: "grayscale(1) brightness(1.2) contrast(0.9)",
            }}
          />

          {/* Minimalist Grid Texture Overlay */}
          <div
            className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Bottom vignette for focus */}
          <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-t from-slate-50/50 via-transparent to-transparent opacity-80" />
        </>
      )}

      {/* Floating Sidebar */}

      <div className="hidden md:flex p-4 pr-0 h-full w-[260px]">
        <aside className="w-full h-full glass-panel rounded-2xl flex flex-col relative z-20 overflow-hidden">
          <div className="px-6 pt-8 pb-6 flex items-center gap-3 cursor-default group">
            <div className="w-8 h-8 rounded-lg bg-white overflow-hidden flex items-center justify-center shadow-sm">
              <MilyflyLogo className="w-full h-full object-contain p-1 transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div
              className={`font-extrabold text-xl tracking-tight font-heading mt-1 ${uiVersion === "v2" ? "text-slate-900" : "text-slate-800"}`}
            >
              MILYFLY
            </div>
          </div>

          <nav className="flex-1 flex flex-col gap-1 px-4 overflow-y-auto hidden-scrollbar">
            {menuItems.map((item: any) => {
              if (item.isSeparator) {
                return (
                  <div
                    key={Math.random()}
                    className="border-t border-slate-200/60 my-2"
                  />
                );
              }
              const Icon = item.icon;
              const isPricingActive = location.pathname.startsWith("/pricing");
              const isActive = item.children
                ? isPricingActive
                : location.pathname === item.id;

              return (
                <div key={item.id} className="flex flex-col gap-1">
                  <NavLink
                    to={item.children ? item.children[0].id : item.id}
                    className={() => `
                      w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 group
                      ${
                        isActive
                          ? uiVersion === "v2"
                            ? "bg-sky-500/10 text-sky-600 border border-sky-500/20 shadow-sm"
                            : "bg-sky-50 text-sky-600 border border-sky-100 shadow-sm"
                          : uiVersion === "v2"
                            ? "text-slate-500 hover:text-sky-600 hover:bg-slate-50 border border-transparent"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-[18px] h-[18px] opacity-80 group-hover:opacity-100 transition-opacity ${item.color || ""}`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && item.badge === "需补货" && (
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </NavLink>

                  {/* Sub-menu items */}
                  {item.children &&
                    (item.id === "/pricing"
                      ? isPricingActive
                      : location.pathname.startsWith(item.id)) && (
                      <div className="flex flex-col gap-1 ml-6 mt-1 mb-2 border-l-2 border-slate-100 pl-2">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive = location.pathname === child.id;
                          return (
                            <NavLink
                              key={child.id}
                              to={child.id}
                              className={() => `
                              flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-medium transition-all
                              ${
                                isChildActive
                                  ? uiVersion === "v2"
                                    ? "text-sky-600 bg-sky-500/5"
                                    : "text-sky-600 bg-sky-50/50"
                                  : uiVersion === "v2"
                                    ? "text-slate-400 hover:text-sky-600 hover:bg-slate-50"
                                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                              }
                            `}
                            >
                              <ChildIcon className="w-3.5 h-3.5" />
                              <span>{child.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                </div>
              );
            })}
          </nav>

          <div className="p-4 mt-auto space-y-4">
            <div
              className={`glass-card rounded-xl p-4 relative overflow-hidden group transition-colors cursor-pointer ${uiVersion === "v2" ? "border-slate-800" : ""}`}
            >
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mb-1.5 flex items-center justify-between">
                <span>管理员</span>
                <Settings
                  className={`w-3 h-3 text-slate-400 group-hover:text-slate-700 transition-colors hover:rotate-90 duration-500 ${uiVersion === "v2" ? "group-hover:text-sky-400" : ""}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${uiVersion === "v2" ? "bg-sky-600" : "bg-sky-500"}`}
                >
                  JC
                </div>
                <div>
                  <div
                    className={`text-sm font-semibold ${uiVersion === "v2" ? "text-slate-900" : "text-slate-800"}`}
                  >
                    Juan Carlos
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-1">
                    v1.0.6
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Dynamic Island Top Bar Container */}
        <header className="h-[72px] shrink-0 flex items-center justify-between px-8 z-10">
          <div
            className={`flex items-center gap-2 font-medium text-sm ${uiVersion === "v2" ? "text-slate-400" : "text-slate-500"}`}
          >
            <span className="hidden sm:inline">MILYFLY 控制台</span>
            <span className="text-slate-300 hidden sm:inline">/</span>
            <span
              className={`capitalize font-semibold ${uiVersion === "v2" ? "text-slate-900" : "text-slate-800"}`}
            >
              {location.pathname === "/"
                ? "总览看板"
                : location.pathname
                    .substring(1)
                    .split("/")[0]
                    .replace(/-/g, " ")}
            </span>
            <span className="ml-2 text-[8px] text-slate-300 opacity-50">
              v1.0.5
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center gap-3 mx-4">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-sm text-xs font-mono font-bold tracking-tight border ${uiVersion === "v2" ? "bg-sky-500/10 border-sky-500/20 text-sky-400" : "bg-gradient-to-r from-sky-50 to-indigo-50 border-sky-100 text-sky-700"}`}
            >
              <Compass
                className={`w-3.5 h-3.5 animate-pulse ${uiVersion === "v2" ? "text-sky-300" : "text-sky-500"}`}
              />
              <span className="hidden xl:inline">墨西哥当地时间：</span>
              <span>{currentTime}</span>
            </div>

            {/* 汇率转换小工具 - 仅在较大屏幕显示 */}
            <div className="hidden lg:flex items-center bg-white/80 backdrop-blur border border-slate-200 rounded-full px-2 py-0.5 shadow-sm overflow-hidden h-[28px]">
              <CurrencyConverter />
            </div>

            {/* 全局数据导出 - 增加阴影和边框确保可见性 */}
            <div className="relative z-50">{/* DataExporter was here */}</div>
          </div>

          <div className="flex items-center gap-4">
            {/* 更新日志按钮 */}
            <button
              onClick={() => {
                setIsNotificationOpen(!isNotificationOpen);
                if (appUpdates.length > 0) {
                  localStorage.setItem(
                    "milyfly_last_seen_version",
                    appUpdates[0].version,
                  );
                }
                setHasNewUpdate(false);
              }}
              className={`relative w-10 h-10 rounded-full glass-panel shadow-none flex items-center justify-center transition-all group ${isNotificationOpen ? "bg-sky-500/20 ring-2 ring-sky-500/50" : "hover:bg-slate-50/10"}`}
            >
              <Bell
                className={`w-[18px] h-[18px] transition-colors ${isNotificationOpen ? "text-sky-400" : "text-slate-500 group-hover:text-white"}`}
              />
              {hasNewUpdate && (
                <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full ring-2 ring-slate-900 animate-pulse" />
              )}
            </button>

            {/* 居中弹窗 */}
            <AnimatePresence>
              {isNotificationOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                    style={{ zIndex: 9998 }}
                    onClick={() => setIsNotificationOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="fixed inset-0 flex items-center justify-center p-4"
                    style={{ zIndex: 9999 }}
                  >
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[80vh] flex flex-col">
                      {/* Header */}
                      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center">
                            <History className="w-5 h-5 text-sky-600" />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-900">
                              应用更新日志
                            </h3>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                              记录每一次功能迭代与优化
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-bold bg-sky-500/10 text-sky-600 px-3 py-1 rounded-full font-mono border border-sky-200/50">
                            v{appUpdates[0]?.version || "1.0.0"}
                          </span>
                          <button
                            onClick={() => setIsNotificationOpen(false)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                          >
                            <X className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {appUpdates.length === 0 ? (
                          <div className="py-16 text-center">
                            <History className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                            <p className="text-sm text-slate-400 font-medium">
                              暂无更新记录
                            </p>
                          </div>
                        ) : (
                          appUpdates.slice(0, 3).map((update, idx) => (
                            <div
                              key={update.id}
                              className={`p-5 rounded-xl transition-all ${
                                idx === 0
                                  ? "bg-sky-50/80 border border-sky-200/60 shadow-sm"
                                  : "bg-white border border-slate-100"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                      update.type === "feature"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : update.type === "fix"
                                          ? "bg-rose-100 text-rose-700"
                                          : "bg-sky-100 text-sky-700"
                                    }`}
                                  >
                                    {update.type === "feature"
                                      ? "✨ 新功能"
                                      : update.type === "fix"
                                        ? "🔧 修复"
                                        : "📝 更新"}
                                    <span className="font-mono">
                                      v{update.version}
                                    </span>
                                  </span>
                                  {idx === 0 && (
                                    <span className="text-[9px] font-bold text-sky-500 bg-sky-100 px-2 py-0.5 rounded-full">
                                      最新
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(
                                    update.created_at,
                                  ).toLocaleDateString("zh-CN", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                  })}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-slate-800 mb-2">
                                {update.title}
                              </h4>
                              <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line border-l-2 border-sky-200 pl-3 ml-0.5">
                                {update.content}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Footer */}
                      <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-100 text-center shrink-0">
                        <p className="text-[10px] text-slate-400 font-medium">
                          🔄 每次代码更新后自动记录
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto px-4 md:px-8 pb-10 custom-scrollbar relative">
          {/* Actual content (above decorations in stacking context) */}
          <div className="relative z-10 max-w-7xl mx-auto min-h-full animate-slide-in-right">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Scrollbar styling injected here for simplicity */}
      <style>{`
        .hidden-scrollbar::-webkit-scrollbar { display: none; }
        .hidden-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
      `}</style>
    </div>
  );
}
