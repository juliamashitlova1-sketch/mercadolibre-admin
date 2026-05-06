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
  PlusCircle,
  Compass,
  Calculator,
  History,
  CheckCircle,
  Inbox,
  CreditCard,
  PackageX,
  MessageSquare,
  BarChart3,
  Star,
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

// ============= Daily Check-in Component =============
const CHECK_ITEMS = [
  { id: "orders", label: "订单数据上传" },
  { id: "visits", label: "访问数据上传" },
  { id: "ads", label: "广告数据上传" },
  { id: "competitors", label: "竞品数据每日更新" },
  { id: "reviews", label: "各链接评价检查" },
  { id: "operations", label: "运营动作填写" },
];

function getTodayKey(): string {
  return getMexicoTimeString().split(" ")[0]; // "YYYY-MM-DD"
}

function loadCheckins(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem("daily_checkin_" + getTodayKey());
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function DailyCheckIn({ currentTime }: { currentTime: string }) {
  const today = getTodayKey();
  const [checkins, setCheckins] =
    useState<Record<string, boolean>>(loadCheckins);
  const [showFireworks, setShowFireworks] = useState(false);
  const [fireworkParticles, setFireworkParticles] = useState<any[]>([]);

  // Reload checkins when day changes
  useEffect(() => {
    setCheckins(loadCheckins());
    setShowFireworks(false);
  }, [today]);

  const allDone = CHECK_ITEMS.every((item) => checkins[item.id]);

  const handleToggle = (id: string) => {
    const updated = { ...checkins, [id]: !checkins[id] };
    setCheckins(updated);
    localStorage.setItem("daily_checkin_" + today, JSON.stringify(updated));

    // Check if all done now
    if (CHECK_ITEMS.every((item) => updated[item.id])) {
      triggerFireworks();
    }
  };

  const triggerFireworks = () => {
    setShowFireworks(true);
    // Generate 60 particles
    const particles = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: [
        "#ef4444",
        "#f59e0b",
        "#10b981",
        "#3b82f6",
        "#8b5cf6",
        "#ec4899",
        "#06b6d4",
      ][Math.floor(Math.random() * 7)],
      size: 4 + Math.random() * 8,
      delay: Math.random() * 1.5,
      duration: 1.5 + Math.random() * 2,
      angle: Math.random() * 360,
      distance: 50 + Math.random() * 200,
    }));
    setFireworkParticles(particles);
    setTimeout(() => setShowFireworks(false), 4000);
  };

  const doneCount = CHECK_ITEMS.filter((item) => checkins[item.id]).length;

  return (
    <>
      {/* Fireworks overlay */}
      <AnimatePresence>
        {showFireworks && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 99999 }}
          >
            {fireworkParticles.map((p) => (
              <motion.div
                key={p.id}
                initial={{
                  opacity: 1,
                  x: "50vw",
                  y: "50vh",
                  scale: 0,
                }}
                animate={{
                  opacity: [1, 1, 0],
                  x: `calc(50vw + ${Math.cos((p.angle * Math.PI) / 180) * p.distance}px)`,
                  y: `calc(50vh + ${Math.sin((p.angle * Math.PI) / 180) * p.distance}px)`,
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  ease: "easeOut",
                }}
                className="absolute rounded-full"
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  boxShadow: `0 0 ${p.size}px ${p.color}`,
                }}
              />
            ))}
            {/* Center burst flash */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 0.8, 0], scale: [0, 3, 0] }}
              transition={{ duration: 0.8 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full"
              style={{ boxShadow: "0 0 60px 20px rgba(255,255,255,0.6)" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Check-in Card */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-slate-700 uppercase tracking-wider">
              每日工作打卡
            </span>
          </div>
          <span className="text-[8px] text-slate-400 font-mono">{today}</span>
        </div>

        <div className="text-[8px] text-slate-400 font-medium mb-1.5">
          进度: {doneCount}/{CHECK_ITEMS.length}
          <div className="mt-0.5 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                allDone ? "bg-emerald-500" : "bg-sky-500"
              }`}
              style={{ width: `${(doneCount / CHECK_ITEMS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-0.5">
          {CHECK_ITEMS.map((item) => {
            const done = checkins[item.id];
            return (
              <button
                key={item.id}
                onClick={() => handleToggle(item.id)}
                className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-medium transition-all ${
                  done
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                    : "bg-slate-50 text-slate-500 border border-transparent hover:bg-sky-50 hover:text-sky-600"
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                    done
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-slate-300"
                  }`}
                >
                  {done && (
                    <svg
                      className="w-1.5 h-1.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="truncate">{item.label}</span>
                {done && (
                  <span className="ml-auto text-[7px] text-emerald-500">✓</span>
                )}
              </button>
            );
          })}
        </div>

        {allDone && (
          <div className="mt-2 text-center">
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              🎉 今日全部完成!
            </span>
          </div>
        )}
      </div>
    </>
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
          <div className="px-5 pt-4 pb-3 flex items-center gap-2.5 cursor-default group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-white overflow-hidden flex items-center justify-center shadow-sm">
              <MilyflyLogo className="w-full h-full object-contain p-1 transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div
              className={`font-extrabold text-base tracking-tight font-heading ${uiVersion === "v2" ? "text-slate-900" : "text-slate-800"}`}
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
                    className="border-t border-slate-200/60 my-1.5"
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
                      w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-300 group
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
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity ${item.color || ""}`}
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
                      <div className="flex flex-col gap-0.5 ml-5 mt-0.5 mb-1.5 border-l-2 border-slate-100 pl-1.5">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive = location.pathname === child.id;
                          return (
                            <NavLink
                              key={child.id}
                              to={child.id}
                              className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] font-medium transition-all
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
                              <ChildIcon className="w-3 h-3" />
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

          <div className="p-3 mt-auto shrink-0">
            {/* 每日工作打卡 */}
            <DailyCheckIn currentTime={currentTime} />
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
            {/* 没有更新日志弹窗 */}
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
