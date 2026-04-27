import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { SKUStats } from '../types';
import logo from '../assets/logo.png';
import { STOCK_HEALTH_THRESHOLD } from '../constants';
import {
  Database, Package, ShoppingBag, ShoppingCart,
  TrendingUp, LayoutDashboard,
  DollarSign, AlertTriangle, Activity,
  Search, Bell, Settings, PlusCircle, Compass, Brain, Calculator, History, CheckCircle, Inbox,
  CreditCard, PackageX
} from 'lucide-react';

import { getMexicoTimeString } from '../lib/time';
import DataExporter from '../components/DataExporter';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

const MilyflyLogo = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 100 90" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M 28,45 C 8,10 40,-5 55,25 C 65,-5 98,10 70,45 C 95,50 95,80 75,80 L 40,80 M 12,48 L 22,48 L 27,78 L 48,78" 
      fill="none" 
      stroke="#DF5B18" 
      strokeWidth="6" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <path d="M 24,53 L 55,54 L 52,70 L 26,68 Z" fill="#5E174F" />
    <path d="M 34,53 L 32,69 M 45,54 L 43,70 M 25,60 L 53,61" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="28" cy="84" r="5" fill="#DF5B18" />
    <circle cx="45" cy="84" r="5" fill="#DF5B18" />
  </svg>
);

function CurrencyConverter() {
  const [base, setBase] = useState<'USD' | 'MXN' | 'CNY'>('USD');
  const [val, setVal] = useState<string>('');
  
  const rates = {
    USD: { MXN: 19.85, CNY: 7.24 },
    MXN: { USD: 0.05, CNY: 0.365 },
    CNY: { USD: 0.138, MXN: 2.74 }
  };

  const calculate = (to: 'USD' | 'MXN' | 'CNY') => {
    if (!val || isNaN(Number(val))) return '0.00';
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
        {['USD', 'MXN', 'CNY'].filter(c => c !== base).map(c => (
          <div key={c} className="flex items-center gap-1">
            <span className="text-[9px] font-medium text-slate-400 uppercase">{c}</span>
            <span className="text-[11px] font-mono font-bold text-slate-600">
              {calculate(c as any)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== Particle Connection Lines Component ===== */
function ParticleField({ particles }: { particles: {top:string;left:string;size:number;delay:string;color:string}[] }) {
  return (
    <>
      {particles.map((p, i) => (
        <div key={i}
          className="rounded-full animate-float-particle"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 4}px ${p.color}, 0 0 ${p.size * 8}px ${p.color}40`,
            animationDelay: p.delay,
            opacity: 0.5,
          }}
        />
      ))}
    </>
  );
}

/* ===== Right-side Particle Field (positioned by right) ===== */
function ParticleFieldRight({ particles }: { particles: {top:string;right:string;size:number;delay:string;color:string}[] }) {
  return (
    <>
      {particles.map((p, i) => (
        <div key={i}
          className="rounded-full animate-float-particle"
          style={{
            top: p.top,
            right: p.right,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 4}px ${p.color}, 0 0 ${p.size * 8}px ${p.color}40`,
            animationDelay: p.delay,
            opacity: 0.45,
          }}
        />
      ))}
    </>
  );
}

interface LayoutProps {
  skuData: SKUStats[];
  dailyData: any[];
  fakeOrders: any[];
  cargoDamage: any[];
  operationLogs: any[];
  uiVersion: 'v1' | 'v2';
  onToggleUi: () => void;
  onAddSku: () => void;
}

export default function MainLayout({ 
  skuData, dailyData, fakeOrders, cargoDamage, operationLogs,
  uiVersion, onToggleUi, onAddSku 
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
      const { data, error } = await supabase
        .from('app_updates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const updates = data || [];
      setAppUpdates(updates);
      
      if (updates.length > 0) {
        const latestVersion = updates[0].version;
        const lastSeen = localStorage.getItem('milyfly_last_seen_version');
        if (lastSeen !== latestVersion) {
          setIsNotificationOpen(true);
          setHasNewUpdate(true);
        } else {
          setHasNewUpdate(false);
        }
      }
    } catch (err) {
      console.error('Error fetching updates:', err);
    }
  };

  const inventoryStatus = skuData && skuData.length > 0
    ? skuData.filter(s => Math.floor(s.stock / (s.avgSalesSinceListing || 1)) < STOCK_HEALTH_THRESHOLD).length > 0
      ? '需补货'
      : '正常'
    : '空';

  const menuItems = [
    { 
      id: '/data-dashboard', 
      label: '数据大屏', 
      icon: LayoutDashboard,
      color: 'text-cyan-400',
    },
    { 
      id: '/data-cleaning', 
      label: '数据清洗', 
      icon: Database,
      children: [
        { id: '/data-cleaning/orders', label: '订单及销售数量', icon: ShoppingCart },
        { id: '/data-cleaning/visits', label: '各SKU访问数据', icon: Search },
        { id: '/data-cleaning/ads', label: '各SKU每日广告数据', icon: TrendingUp },
      ]
    },
    { id: '/sku-management', label: 'SKU管理', icon: Package },
    { id: '/fake-orders', label: '刷单支出', icon: CreditCard },
    { id: '/cargo-damage', label: '货损支出', icon: PackageX },
    { id: '/health', label: '账号健康', icon: AlertTriangle },
    { id: '/operations', label: '运营动作', icon: Activity },
    { id: '/ai-brain', label: 'AI 智能大脑', icon: Brain, color: 'text-purple-500' },
    { 
      id: '/pricing', 
      label: '新品核价', 
      icon: Calculator, 
      color: 'text-emerald-500',
      children: [
        { id: '/pricing/new', label: '待核价 (计算器)', icon: PlusCircle },
        { id: '/pricing/list', label: '已核价清单', icon: History },
        { id: '/pricing/success', label: '核价成功区', icon: CheckCircle, shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.2)]' },
        { id: '/pricing/staging', label: '暂存箱', icon: Inbox },
      ]
    },
  ];

  // Stable random grid for DATA_STREAM card
  const streamGrid = useMemo(() => 
    Array.from({length: 16}).map((_, i) => i % 3 === 0 ? 'rgba(56,189,248,0.2)' : i % 5 === 0 ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)')
  , []);

  return (
    <div className={`flex h-screen overflow-hidden selection:bg-sky-100 selection:text-sky-900 transition-colors duration-700 ${uiVersion === 'v2' ? 'theme-v2 bg-[#020617] text-slate-300' : 'bg-transparent'}`}>
      {/* Floating Sidebar */}
      <div className="hidden md:flex p-4 pr-0 h-full w-[260px]">
        <aside className="w-full h-full glass-panel rounded-2xl flex flex-col relative z-20 overflow-hidden">
          <div className="px-6 pt-8 pb-6 flex items-center gap-3 cursor-default group">
            <div className="w-8 h-8 rounded-lg bg-white overflow-hidden flex items-center justify-center shadow-sm">
              <MilyflyLogo className="w-full h-full object-contain p-1 transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div className={`font-extrabold text-xl tracking-tight font-heading mt-1 ${uiVersion === 'v2' ? 'text-white' : 'text-slate-800'}`}>
              MILYFLY
            </div>
          </div>
          
          <nav className="flex-1 flex flex-col gap-1 px-4 overflow-y-auto hidden-scrollbar">
            {menuItems.map((item: any) => {
              const Icon = item.icon;
              const isPricingActive = location.pathname.startsWith('/pricing');
              const isActive = item.children ? isPricingActive : location.pathname === item.id;
              
              return (
                <div key={item.id} className="flex flex-col gap-1">
                  <NavLink
                    to={item.children ? item.children[0].id : item.id}
                    className={() => `
                      w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 group
                      ${isActive 
                        ? (uiVersion === 'v2' 
                            ? 'bg-sky-500/10 text-white border border-sky-500/30' 
                            : 'bg-sky-50 text-sky-600 border border-sky-100 shadow-sm') 
                        : (uiVersion === 'v2'
                            ? 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent')}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-[18px] h-[18px] opacity-80 group-hover:opacity-100 transition-opacity ${item.color || ''}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && item.badge === '需补货' && (
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </NavLink>

                  {/* Sub-menu items */}
                  {item.children && (item.id === '/pricing' ? isPricingActive : location.pathname.startsWith(item.id)) && (
                    <div className="flex flex-col gap-1 ml-6 mt-1 mb-2 border-l-2 border-slate-100 pl-2">
                      {item.children.map(child => {
                        const ChildIcon = child.icon;
                        const isChildActive = location.pathname === child.id;
                        return (
                          <NavLink
                            key={child.id}
                            to={child.id}
                            className={() => `
                              flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-medium transition-all
                              ${isChildActive 
                                ? (uiVersion === 'v2' ? 'text-sky-400 bg-sky-500/10' : 'text-sky-600 bg-sky-50/50') 
                                : (uiVersion === 'v2' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50')}
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
            <div className={`glass-card rounded-xl p-4 relative overflow-hidden group transition-colors cursor-pointer ${uiVersion === 'v2' ? 'border-slate-800' : ''}`}>
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mb-1.5 flex items-center justify-between">
                <span>管理员</span>
                <Settings className={`w-3 h-3 text-slate-400 group-hover:text-slate-700 transition-colors hover:rotate-90 duration-500 ${uiVersion === 'v2' ? 'group-hover:text-sky-400' : ''}`} />
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${uiVersion === 'v2' ? 'bg-sky-600' : 'bg-sky-500'}`}>
                  JC
                </div>
                <div>
                  <div className={`text-sm font-semibold ${uiVersion === 'v2' ? 'text-white' : 'text-slate-800'}`}>Juan Carlos</div>
                  <div className="text-xs text-slate-500 font-mono mt-1">v1.0.6</div>
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
          <div className={`flex items-center gap-2 font-medium text-sm ${uiVersion === 'v2' ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="hidden sm:inline">MILYFLY 控制台</span>
            <span className="text-slate-300 hidden sm:inline">/</span>
            <span className={`capitalize font-semibold ${uiVersion === 'v2' ? 'text-white' : 'text-slate-800'}`}>
              {location.pathname === '/' ? '总览看板' : location.pathname.substring(1).split('/')[0].replace(/-/g, ' ')}
            </span>
            <span className="ml-2 text-[8px] text-slate-300 opacity-50">v1.0.5</span>

          </div>

          <div className="flex-1 flex items-center justify-center gap-3 mx-4">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-sm text-xs font-mono font-bold tracking-tight border ${uiVersion === 'v2' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' : 'bg-gradient-to-r from-sky-50 to-indigo-50 border-sky-100 text-sky-700'}`}>
              <Compass className={`w-3.5 h-3.5 animate-pulse ${uiVersion === 'v2' ? 'text-sky-300' : 'text-sky-500'}`} />
              <span className="hidden xl:inline">墨西哥当地时间：</span>
              <span>{currentTime}</span>
            </div>
            
            {/* 汇率转换小工具 - 仅在较大屏幕显示 */}
            <div className="hidden lg:flex items-center bg-white/80 backdrop-blur border border-slate-200 rounded-full px-2 py-0.5 shadow-sm overflow-hidden h-[28px]">
               <CurrencyConverter />
            </div>

            {/* 全局数据导出 - 增加阴影和边框确保可见性 */}
            <div className="relative z-50">
              {/* DataExporter was here */}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 全局数据导出 - 按用户要求移至搜索栏左侧 */}
            {/* FORCE SYNC v1.0.2 */}
            <div className="hidden xl:block">

              <DataExporter skuData={skuData} />
            </div>

            <div className="hidden lg:flex items-center gap-2 glass-panel shadow-none h-10 px-4 rounded-full text-sm text-slate-400 focus-within:text-slate-700 transition-colors cursor-text group w-[240px]">
              <Search className="w-4 h-4 opacity-70 group-focus-within:opacity-100 group-focus-within:text-sky-500" />
              <input 
                type="text" 
                placeholder="搜索 SKU 或 订单号..." 
                className="flex-1 text-xs bg-transparent outline-none placeholder:text-slate-400 text-slate-800"
              />
              <kbd className="hidden group-hover:flex items-center h-5 px-1.5 text-[10px] font-mono bg-slate-100 rounded font-medium text-slate-500 border border-slate-200">⌘K</kbd>
            </div>
            
            <div className="relative">
              <button 
                onClick={() => {
                  setIsNotificationOpen(!isNotificationOpen);
                  if (appUpdates.length > 0) {
                    localStorage.setItem('milyfly_last_seen_version', appUpdates[0].version);
                  }
                  setHasNewUpdate(false);
                }}
                className={`relative w-10 h-10 rounded-full glass-panel shadow-none flex items-center justify-center transition-all group ${isNotificationOpen ? 'bg-sky-500/20 ring-2 ring-sky-500/50' : 'hover:bg-slate-50/10'}`}
              >
                <Bell className={`w-[18px] h-[18px] transition-colors ${isNotificationOpen ? 'text-sky-400' : 'text-slate-500 group-hover:text-white'}`} />
                {hasNewUpdate && (
                  <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full ring-2 ring-slate-900 animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {isNotificationOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotificationOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-[320px] bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-800 bg-slate-800/50">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <History className="w-4 h-4 text-sky-400" />
                            应用更新日志
                          </h3>
                          <span className="text-[10px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full font-mono font-bold">LIVE v1.0.5</span>
                        </div>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {appUpdates.length === 0 ? (
                          <div className="py-8 text-center text-slate-500 text-xs">暂无更新记录</div>
                        ) : (
                          appUpdates.map((update) => (
                            <div key={update.id} className="p-3 rounded-xl hover:bg-white/5 transition-colors group">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  update.type === 'feature' ? 'bg-emerald-500/10 text-emerald-400' :
                                  update.type === 'fix' ? 'bg-rose-500/10 text-rose-400' :
                                  'bg-sky-500/10 text-sky-400'
                                }`}>
                                  {update.version}
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono">
                                  {new Date(update.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-slate-200 mb-1 group-hover:text-white transition-colors">{update.title}</h4>
                              <p className="text-[11px] text-slate-400 leading-relaxed whitespace-pre-line border-l-2 border-slate-800 pl-2 ml-1">
                                {update.content}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="p-3 bg-slate-800/30 border-t border-slate-800 text-center">
                        <p className="text-[10px] text-slate-500">MILYFLY 云端同步系统已就绪</p>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto px-4 md:px-8 pb-10 custom-scrollbar relative">

          {/* ============================================================ */}
          
          {/* ============================================================ */}
          {/* === LEFT SIDE: 截图100%还原 - 发光3D立方体 + 光束 + 网格 + 粒子 === */}
          {/* ============================================================ */}
          <div className="pointer-events-none fixed left-0 top-0 bottom-0 w-[280px] xl:w-[360px] hidden lg:block z-0" aria-hidden="true">

            {/* 背景深色渐变底色 */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e27] via-[#0d1333] to-[#0a1628]"/>

            {/* 主3D发光立方体（截图核心元素） */}
            <div className="absolute top-[18%] left-[20px]">
              <svg width="180" height="200" viewBox="0 0 180 200" fill="none">
                <defs>
                  <linearGradient id="cube-edge" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00e5ff"/>
                    <stop offset="50%" stopColor="#00b4ff"/>
                    <stop offset="100%" stopColor="#7c4dff"/>
                  </linearGradient>
                  <linearGradient id="cube-face-top" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.12"/>
                    <stop offset="100%" stopColor="#7c4dff" stopOpacity="0.04"/>
                  </linearGradient>
                  <linearGradient id="cube-face-left" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#7c4dff" stopOpacity="0.08"/>
                    <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.02"/>
                  </linearGradient>
                  <linearGradient id="cube-face-right" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00b4ff" stopOpacity="0.06"/>
                    <stop offset="100%" stopColor="#7c4dff" stopOpacity="0.02"/>
                  </linearGradient>
                  <linearGradient id="beam-grad" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.6"/>
                    <stop offset="40%" stopColor="#00b4ff" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#7c4dff" stopOpacity="0"/>
                  </linearGradient>
                  <filter id="cube-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="6" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                  <filter id="beam-glow" x="-100%" y="-20%" width="300%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>

                {/* 立方体本体 (isometric) */}
                <g filter="url(#cube-glow)">
                  <polygon points="90,10 160,48 90,86 20,48" stroke="url(#cube-edge)" strokeWidth="2" fill="url(#cube-face-top)"/>
                  <polygon points="20,48 90,86 90,146 20,108" stroke="url(#cube-edge)" strokeWidth="1.5" fill="url(#cube-face-left)"/>
                  <polygon points="90,86 160,48 160,108 90,146" stroke="url(#cube-edge)" strokeWidth="1.5" fill="url(#cube-face-right)"/>
                  <line x1="90" y1="86" x2="90" y2="10" stroke="#00e5ff" strokeWidth="1.5" opacity="0.9"/>
                  <line x1="90" y1="86" x2="20" y2="48" stroke="#00b4ff" strokeWidth="1.2" opacity="0.6"/>
                  <line x1="90" y1="86" x2="160" y2="48" stroke="#7c4dff" strokeWidth="1.2" opacity="0.55"/>
                </g>

                {/* 中心节点发光点 */}
                <circle cx="90" cy="86" r="5" fill="#ffffff" filter="url(#cube-glow)"/>
                <circle cx="90" cy="86" r="14" fill="none" stroke="#00e5ff" strokeWidth="1" opacity="0.35" className="animate-ping-slow"/>

                {/* 向下发射的光束 */}
                <g filter="url(#beam-glow)">
                  <polygon points="75,145 105,145 115,195 65,195" fill="url(#beam-grad)" opacity="0.7"/>
                  <polygon points="30,108 45,118 38,170 15,155" fill="url(#beam-grad)" opacity="0.35"/>
                  <polygon points="150,108 135,118 142,170 165,155" fill="url(#beam-grad)" opacity="0.35"/>
                </g>

                {/* 底部光斑/网格交汇点发光 */}
                <ellipse cx="90" cy="192" rx="30" ry="8" fill="#00e5ff" opacity="0.12" filter="url(#cube-glow)"/>

                {/* 顶面顶点高亮 */}
                <circle cx="90" cy="10" r="3" fill="#00e5ff" opacity="0.9"/>
                <circle cx="160" cy="48" r="2.5" fill="#7c4dff" opacity="0.8"/>
                <circle cx="20" cy="48" r="2.5" fill="#00b4ff" opacity="0.85"/>
              </svg>
            </div>

            {/* 透视网格地板（光束照射区域） */}
            <div className="absolute top-[62%] left-[-10px] w-[280px] h-[150px]">
              <svg width="280" height="150" viewBox="0 0 280 150" fill="none" className="opacity-[0.35]">
                <defs>
                  <linearGradient id="grid-floor" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#7c4dff" stopOpacity="0.05"/>
                  </linearGradient>
                </defs>
                {[0.08, 0.16, 0.26, 0.38, 0.52, 0.68, 0.88].map((yRatio, i) => (
                  <line key={'fh'+i} x1={140 - 130 * yRatio} y1={20 + yRatio * 110}
                    x2={140 + 130 * yRatio} y2={20 + yRatio * 110}
                    stroke="url(#grid-floor)" strokeWidth={i < 3 ? 1 : 0.6}/>
                ))}
                {[-1,-0.6,-0.25,0.05,0.32,0.58,0.82].map((xOff, i) => (
                  <line key={'fv'+i} x1={140 + xOff * 140} y1="20"
                    x2={140 + xOff * 80} y2="135"
                    stroke="url(#grid-floor)" strokeWidth={Math.abs(xOff) < 0.3 ? 1 : 0.5}/>
                ))}
              </svg>
            </div>

            {/* 散布的粒子/星点 */}
            {[
              {top:'8%', left:'120px', size:2.5, color:'#00e5ff', delay:'0s'},
              {top:'15%', left:'250px', size:2, color:'#7c4dff', delay:'1s'},
              {top:'28%', left:'60px', size:3, color:'#00b4ff', delay:'0.5s'},
              {top:'42%', left:'290px', size:2, color:'#00e5ff', delay:'2s'},
              {top:'52%', left:'40px', size:2.5, color:'#c084fc', delay:'1.3s'},
              {top:'66%', left:'270px', size:2, color:'#00b4ff', delay:'0.8s'},
              {top:'78%', left:'100px', size:3, color:'#7c4dff', delay:'1.8s'},
              {top:'88%', left:'240px', size:2, color:'#00e5ff', delay:'0.3s'},
              {top:'96%', left:'50px', size:2.5, color:'#a78bfa', delay:'2.3s'},
            ].map((p, i) => (
              <div key={i} className="rounded-full animate-float-particle"
                style={{
                  top: p.top, left: p.left,
                  width: p.size, height: p.size,
                  backgroundColor: p.color,
                  boxShadow: '0 0 '+p.size*4+'px '+p.color,
                  animationDelay: p.delay,
                  opacity: 0.65,
                }}
              />
            ))}

            {/* 几何装饰：小六边形 */}
            <div className="absolute top-[5%] left:[5%]" style={{opacity: 0.4}}>
              <svg width="36" height="42" viewBox="0 0 36 42" fill="none" className="animate-pulse-slow">
                <polygon points="18,1 34,11 34,31 18,41 2,31 2,11" stroke="#00e5ff" strokeWidth="1" fill="rgba(0,229,255,0.04)"/>
                <polygon points="18,10 26,15 26,27 18,32 10,27 10,15" stroke="#7c4dff" strokeWidth="0.6" fill="none" opacity="0.5"/>
              </svg>
            </div>

            {/* 垂直光线条装饰 */}
            <div className="absolute top-[5%] left:[3px] w-[2px] h-[92%] rounded-full overflow-hidden" style={{opacity: 0.3}}>
              <div className="w-full h-[25%] bg-gradient-to-b from-transparent via-cyan-400 to-transparent animate-light-streak"/>
            </div>
          </div>

          {/* ============================================================ */}
          {/* === RIGHT SIDE: 截图100%还原 - 行星/光环/地面能量环/星空/AI智能运营 === */}
          {/* ============================================================ */}
          <div className="pointer-events-none fixed right-0 top-0 bottom-0 w-[280px] xl:w-[360px] hidden lg:block z-0" aria-hidden="true">

            {/* 深空背景渐变 */}
            <div className="absolute inset-0 bg-gradient-to-bl from-[#0d0a2e] via-[#0f1035] via-[#111836] to-[#0a1428]"/>

            {/* 远景：山脉/地平线剪影 */}
            <div className="absolute bottom-0 right-0 w-full h-[35%]">
              <svg width="100%" height="100%" viewBox="0 0 360 130" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="mountain-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1a1040" stopOpacity="0.9"/>
                    <stop offset="100%" stopColor="#0a0e24" stopOpacity="1"/>
                  </linearGradient>
                </defs>
                <path d="M0,130 L0,95 Q30,70 60,88 T130,78 T190,95 T260,72 T320,90 Q350,80 360,85 L360,130 Z" fill="url(#mountain-grad)"/>
                <path d="M0,130 L0,105 Q40,88 80,100 T160,93 T230,108 T310,87 L360,98 L360,130 Z" fill="#080c1e" opacity="0.7"/>
              </svg>
            </div>

            {/* 星场粒子 */}
            {[
              {top:'3%', right:'45px', size:1.5, delay:'0s'}, {top:'7%', right:'180px', size:1, delay:'0.8s'},
              {top:'12%', right:'90px', size:2, delay:'0.3s'}, {top:'17%', right:'260px', size:1.5, delay:'1.5s'},
              {top:'24%', right:'35px', size:1, delay:'2s'}, {top:'29%', right:'150px', size:1.8, delay:'0.6s'},
              {top:'35%', right:'280px', size:1.2, delay:'1.2s'}, {top:'41%', right:'70px', size:1, delay:'0.4s'},
              {top:'47%', right:'220px', size:1.5, delay:'1.8s'}, {top:'53%', right:'300px', size:1, delay:'0.9s'},
              {top:'59%', right:'55px', size:1.3, delay:'2.3s'}, {top:'64%', right:'175px', size:1, delay:'0.2s'},
              {top:'71%', right:'250px', size:1.5, delay:'1.1s'}, {top:'77%', right:'30px', size:1, delay:'1.6s'},
              {top:'83%', right:'135px', size:1.2, delay:'0.7s'}, {top:'89%', right:'210px', size:1, delay:'2.1s'},
              {top:'94%', right:'60px', size:1.5, delay:'1.4s'},
            ].map((s, i) => (
              <div key={'star-'+i} className="rounded-full animate-twinkle"
                style={{
                  top: s.top, right: s.right, width: s.size, height: s.size,
                  backgroundColor: '#e0f4ff',
                  boxShadow: '0 0 '+s.size*3+'px rgba(200,230,255,0.5)',
                  opacity: i % 3 === 0 ? 0.9 : 0.5,
                  animationDelay: s.delay,
                }}
              />
            ))}

            {/* 核心元素：行星（带环） */}
            <div className="absolute top-[2%] right-[10px]">
              <svg width="220" height="220" viewBox="0 0 220 220" fill="none">
                <defs>
                  <radialGradient id="planet-surface" cx="35%" cy="35%" r="60%">
                    <stop offset="0%" stopColor="#4facfe" stopOpacity="1"/>
                    <stop offset="40%" stopColor="#1a3a8f" stopOpacity="0.95"/>
                    <stop offset="75%" stopColor="#0d1b54" stopOpacity="1"/>
                    <stop offset="100%" stopColor="#050a20" stopOpacity="1"/>
                  </radialGradient>
                  <radialGradient id="planet-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="60%" stopColor="#4facfe" stopOpacity="0.15"/>
                    <stop offset="100%" stopColor="#4facfe" stopOpacity="0"/>
                  </radialGradient>
                  <linearGradient id="ring-main" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7c4dff" stopOpacity="0"/>
                    <stop offset="20%" stopColor="#b388ff" stopOpacity="0.6"/>
                    <stop offset="50%" stopColor="#d4a5ff" stopOpacity="0.8"/>
                    <stop offset="80%" stopColor="#b388ff" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#7c4dff" stopOpacity="0"/>
                  </linearGradient>
                  <filter id="planet-blur"><feGaussianBlur stdDeviation="4"/></filter>
                </defs>
                <circle cx="110" cy="110" r="95" fill="url(#planet-glow)"/>
                <ellipse cx="110" cy="110" rx="105" ry="28" stroke="url(#ring-main)" strokeWidth="3" fill="none" transform="rotate(-18 110 110)" opacity="0.5"/>
                <circle cx="110" cy="110" r="68" fill="url(#planet-surface)"/>
                <path d="M55,85 Q80,75 105,82 T155,88" stroke="#4facfe" strokeWidth="0.8" fill="none" opacity="0.25"/>
                <path d="M60,110 Q90,100 120,108 T165,112" stroke="#4facfe" strokeWidth="0.6" fill="none" opacity="0.18"/>
                <path d="M70,138 Q100,128 130,136" stroke="#4facfe" strokeWidth="0.5" fill="none" opacity="0.15"/>
                <path d="M12,102 A105,28 0 0,0 208,118" stroke="url(#ring-main)" strokeWidth="4" fill="none" transform="rotate(-18 110 110)" opacity="0.7" strokeLinecap="round"/>
                <circle cx="110" cy="110" r="68" fill="none" stroke="#4facfe" strokeWidth="0.5" opacity="0.3"/>
              </svg>
            </div>

            {/* "8.2%" 文字标签 */}
            <div className="absolute top-[33%] right-[55px]">
              <span className="text-2xl font-mono font-bold tracking-tight" style={{color: '#00e5ff', textShadow: '0 0 12px rgba(0,229,255,0.5), 0 0 30px rgba(0,229,255,0.2)'}}>8.2%</span>
            </div>

            {/* 地面同心圆能量环（截图右下角核心特征） */}
            <div className="absolute bottom-[8%] right-[20px]">
              <svg width="260" height="200" viewBox="0 0 260 200" fill="none">
                <defs>
                  <radialGradient id="ground-ring-glow" cx="50%" cy="70%" r="50%">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.15"/>
                    <stop offset="60%" stopColor="#7c4dff" stopOpacity="0.06"/>
                    <stop offset="100%" stopColor="#7c4dff" stopOpacity="0"/>
                  </radialGradient>
                  <linearGradient id="ring-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.2"/>
                    <stop offset="50%" stopColor="#7c4dff" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.2"/>
                  </linearGradient>
                  <filter id="ring-glow-filter"><feGaussianBlur stdDeviation="1.5"/></filter>
                </defs>
                <ellipse cx="130" cy="145" rx="120" ry="50" fill="url(#ground-ring-glow)"/>
                <ellipse cx="130" cy="148" rx="115" ry="44" stroke="#7c4dff" strokeWidth="0.8" fill="none" opacity="0.3" strokeDasharray="4 6"/>
                <ellipse cx="130" cy="149" rx="95" ry="36" stroke="url(#ring-stroke)" strokeWidth="1" fill="none" opacity="0.45" filter="url(#ring-glow-filter)"/>
                <ellipse cx="130" cy="150" rx="75" ry="28" stroke="#00e5ff" strokeWidth="1.2" fill="none" opacity="0.55" filter="url(#ring-glow-filter)"/>
                <ellipse cx="130" cy="151" rx="55" ry="20" stroke="#7c4dff" strokeWidth="1.2" fill="none" opacity="0.6" strokeDasharray="8 4"/>
                <ellipse cx="130" cy="152" rx="37" ry="13" stroke="#00e5ff" strokeWidth="1.5" fill="none" opacity="0.7" filter="url(#ring-glow-filter)"/>
                <ellipse cx="130" cy="153" rx="20" ry="7" stroke="#ffffff" strokeWidth="1" fill="none" opacity="0.5"/>
                <circle cx="130" cy="153" r="4" fill="#00e5ff" opacity="0.8" filter="url(#ring-glow-filter)"/>
                <circle cx="130" cy="153" r="10" fill="none" stroke="#00e5ff" strokeWidth="0.6" opacity="0.3" className="animate-ping-slow"/>
              </svg>
            </div>

            {/* "AI 智能运营" 文字标签 */}
            <div className="absolute bottom-[14%] right-[80px]">
              <span className="text-[11px] font-medium tracking-wider" style={{color: '#7c4dff', opacity: 0.7, letterSpacing: '2px'}}>AI 智能运营</span>
            </div>

            {/* 右上角三角形装饰 */}
            <div className="absolute top-[1%] right-[5%]" style={{opacity: 0.4}}>
              <svg width="40" height="46" viewBox="0 0 40 46" fill="none" className="animate-pulse-slow">
                <polygon points="20,2 38,44 2,44" stroke="#7c4dff" strokeWidth="1" fill="rgba(124,77,255,0.06)"/>
                <polygon points="20,14 30,36 10,36" stroke="#00e5ff" strokeWidth="0.6" fill="rgba(0,229,255,0.03)" opacity="0.6"/>
              </svg>
            </div>

            {/* 右侧垂直光条 */}
            <div className="absolute top-[8%] right:[3px] w-[2px] h-[90%] rounded-full overflow-hidden" style={{opacity: 0.25}}>
              <div className="w-full h-[22%] bg-gradient-to-b from-transparent via-purple-500 to-transparent animate-light-streak" style={{animationDelay: '1.5s'}}/>
            </div>
          </div>

          {/* === CENTER: Ambient glow === */}
          <div className="fixed inset-0 pointer-events-none z-0 hidden lg:block" aria-hidden="true">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px]"
                 style={{background: 'radial-gradient(ellipse at center, rgba(56,189,248,0.06) 0%, rgba(99,102,241,0.03) 40%, transparent 65%)', filter: 'blur(50px)'}}/>
          </div>{/* Actual content (above decorations in stacking context) */}
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
