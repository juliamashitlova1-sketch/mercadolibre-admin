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
          {/* === LEFT SIDE: 3D Data Cubes / Glowing Grid / Flowing Lines / Particles === */}
          {/* ============================================================ */}
          <div className="pointer-events-none fixed left-0 top-0 bottom-0 w-[280px] xl:w-[360px] hidden lg:block z-0" aria-hidden="true">

            {/* --- LAYER 1: Deep background grid with glow --- */}
            <div className="absolute inset-0 overflow-hidden">
              <svg width="100%" height="100%" className="opacity-[0.08]">
                <defs>
                  <linearGradient id="grid-grad-l" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3"/>
                  </linearGradient>
                </defs>
                {Array.from({length: 25}).map((_, i) => (
                  <line key={`gh${i}`} x1="0" y1={i * 40} x2="400" y2={i * 40} stroke="url(#grid-grad-l)" strokeWidth="0.4"/>
                ))}
                {Array.from({length: 12}).map((_, i) => (
                  <line key={`gv${i}`} x1={i * 35} y1="0" x2={i * 35} y2="1000" stroke="url(#grid-grad-l)" strokeWidth="0.4"/>
                ))}
              </svg>
            </div>

            {/* --- LAYER 2: Primary 3D Cube Cluster (large, top-left) --- */}
            <div className="absolute top-[8%] left-[25px]">
              <svg width="140" height="140" viewBox="0 0 140 140" fill="none" className="animate-float-slow">
                <defs>
                  <linearGradient id="cube3d-1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4"/>
                    <stop offset="50%" stopColor="#3b82f6"/>
                    <stop offset="100%" stopColor="#8b5cf6"/>
                  </linearGradient>
                  <linearGradient id="cube3d-1-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.12"/>
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.04"/>
                  </linearGradient>
                  <filter id="cube-glow-1">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                {/* Main cube */}
                <path d="M70 15L120 42V98L70 125L20 98V42L70 15Z" stroke="url(#cube3d-1)" strokeWidth="1.5" fill="url(#cube3d-1-fill)" filter="url(#cube-glow-1)"/>
                <path d="M70 15V70" stroke="#38bdf8" strokeWidth="1" opacity="0.8"/>
                <path d="M20 42H120" stroke="#818cf8" strokeWidth="1" opacity="0.5"/>
                <path d="M20 98L70 70L120 98" stroke="#06b6d4" strokeWidth="1" opacity="0.7"/>
                <path d="M70 70L120 42" stroke="#3b82f6" strokeWidth="0.8" opacity="0.4"/>
                <path d="M70 70L20 42" stroke="#6366f1" strokeWidth="0.8" opacity="0.4"/>
                {/* Center node with pulse */}
                <circle cx="70" cy="70" r="4" fill="#38bdf8" opacity="0.9" className="animate-pulse"/>
                <circle cx="70" cy="70" r="8" fill="none" stroke="#38bdf8" strokeWidth="0.5" opacity="0.4" className="animate-ping-slow"/>
                {/* Vertex dots */}
                <circle cx="70" cy="15" r="2" fill="#06b6d4" opacity="0.7"/>
                <circle cx="120" cy="42" r="2" fill="#8b5cf6" opacity="0.6"/>
                <circle cx="120" cy="98" r="2" fill="#6366f1" opacity="0.5"/>
                <circle cx="70" cy="125" r="2" fill="#818cf8" opacity="0.6"/>
                <circle cx="20" cy="98" r="2" fill="#a78bfa" opacity="0.5"/>
                <circle cx="20" cy="42" r="2" fill="#06b6d4" opacity="0.6"/>
              </svg>
            </div>

            {/* --- Secondary smaller cube (offset) --- */}
            <div className="absolute top-[28%] left-[150px]">
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none" className="animate-float-slow" style={{animationDelay: '2s'}}>
                <defs>
                  <linearGradient id="cube3d-2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa"/>
                    <stop offset="100%" stopColor="#06b6d4"/>
                  </linearGradient>
                </defs>
                <path d="M30 8L52 22V48L30 56L8 48V22L30 8Z" stroke="url(#cube3d-2)" strokeWidth="1" fill="rgba(167,139,250,0.06)"/>
                <path d="M30 8V30" stroke="#c084fc" strokeWidth="0.8" opacity="0.6"/>
                <path d="M8 22H52" stroke="#a78bfa" strokeWidth="0.8" opacity="0.4"/>
                <path d="M8 48L30 30L52 48" stroke="#06b6d4" strokeWidth="0.8" opacity="0.5"/>
                <circle cx="30" cy="30" r="2" fill="#c084fc" opacity="0.8"/>
              </svg>
            </div>

            {/* --- Third mini cube (bottom-left) --- */}
            <div className="absolute top-[75%] left-[180px]">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="animate-float-slow" style={{animationDelay: '3.5s'}}>
                <path d="M20 5L35 14V30L20 37L5 30V14L20 5Z" stroke="#22d3ee" strokeWidth="0.8" fill="rgba(34,211,238,0.05)"/>
                <path d="M20 5V20" stroke="#22d3ee" strokeWidth="0.6" opacity="0.5"/>
                <path d="M5 14H35" stroke="#06b6d4" strokeWidth="0.6" opacity="0.3"/>
                <path d="M5 30L20 20L35 30" stroke="#818cf8" strokeWidth="0.6" opacity="0.5"/>
                <circle cx="20" cy="20" r="1.5" fill="#22d3ee" opacity="0.7"/>
              </svg>
            </div>

            {/* --- LAYER 3: Flowing energy lines --- */}
            <div className="absolute top-[40%] left-[10px] w-[240px]">
              <svg width="240" height="80" viewBox="0 0 240 80" fill="none">
                <defs>
                  <linearGradient id="flow-line-1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0"/>
                    <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.7"/>
                    <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.9"/>
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2"/>
                  </linearGradient>
                  <linearGradient id="flow-line-2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.1"/>
                    <stop offset="40%" stopColor="#a78bfa" stopOpacity="0.6"/>
                    <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0"/>
                  </linearGradient>
                  <filter id="line-glow-filter">
                    <feGaussianBlur stdDeviation="2" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                {/* Primary flowing line */}
                <path d="M0,60 C20,55 35,25 55,30 C75,35 90,55 110,35 C130,15 150,40 170,20 C190,0 210,30 240,15"
                  stroke="url(#flow-line-1)" strokeWidth="2" fill="none" strokeLinecap="round"
                  filter="url(#line-glow-filter)" className="animate-draw-line"/>
                {/* Secondary flowing line */}
                <path d="M0,70 C30,65 50,45 70,50 C90,55 105,35 125,45 C145,55 165,30 185,40 C205,50 225,25 240,30"
                  stroke="url(#flow-line-2)" strokeWidth="1.2" fill="none" strokeLinecap="round"
                  opacity="0.6" className="animate-draw-line" style={{animationDelay: '1.5s'}}/>
                {/* Data points on lines */}
                {[[55,30],[110,35],[170,20],[240,15]].map(([cx, cy], i) => (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r="3.5" fill="#38bdf8" opacity="0.9" className={i % 2 === 0 ? 'animate-pulse' : ''}/>
                    <circle cx={cx} cy={cy} r="7" fill="none" stroke="#38bdf8" strokeWidth="0.5" opacity="0.3" className="animate-ping-slow"/>
                  </g>
                ))}
              </svg>
            </div>

            {/* --- LAYER 4: Dense particle field with connection lines --- */}
            <ParticleField particles={[
              {top:'12%', left:'60px', size:4, delay:'0s', color:'#38bdf8'},
              {top:'18%', left:'200px', size:3, delay:'1.2s', color:'#8b5cf6'},
              {top:'25%', left:'120px', size:5, delay:'0.6s', color:'#06b6d4'},
              {top:'32%', left:'40px', size:3, delay:'2.1s', color:'#a78bfa'},
              {top:'38%', left:'260px', size:4, delay:'0.3s', color:'#22d3ee'},
              {top:'48%', left:'80px', size:3, delay:'1.8s', color:'#6366f1'},
              {top:'55%', left:'180px', size:5, delay:'0.9s', color:'#38bdf8'},
              {top:'62%', left:'30px', size:3, delay:'2.5s', color:'#c084fc'},
              {top:'70%', left:'220px', size:4, delay:'1.5s', color:'#06b6d4'},
              {top:'78%', left:'100px', size:3, delay:'0.4s', color:'#818cf8'},
              {top:'85%', left:'250px', size:4, delay:'1.1s', color:'#22d3ee'},
              {top:'92%', left:'50px', size:3, delay:'2.2s', color:'#3b82f6'},
            ]}/>

            {/* --- Particle connection lines (SVG overlay) --- */}
            <div className="absolute inset-0">
              <svg width="100%" height="100%" className="opacity-[0.15]">
                <line x1="60" y1="12%" x2="120" y2="25%" stroke="#38bdf8" strokeWidth="0.4"/>
                <line x1="120" y1="25%" x2="200" y2="18%" stroke="#8b5cf6" strokeWidth="0.3"/>
                <line x1="40" y1="32%" x2="80" y2="48%" stroke="#a78bfa" strokeWidth="0.4"/>
                <line x1="80" y1="48%" x2="180" y2="55%" stroke="#6366f1" strokeWidth="0.3"/>
                <line x1="180" y1="55%" x2="260" y2="38%" stroke="#38bdf8" strokeWidth="0.4"/>
                <line x1="30" y1="62%" x2="100" y2="78%" stroke="#c084fc" strokeWidth="0.3"/>
                <line x1="100" y1="78%" x2="220" y2="70%" stroke="#06b6d4" strokeWidth="0.4"/>
                <line x1="220" y1="70%" x2="250" y2="85%" stroke="#22d3ee" strokeWidth="0.3"/>
                <line x1="50" y1="92%" x2="250" y2="85%" stroke="#3b82f6" strokeWidth="0.4"/>
                <line x1="260" y1="38%" x2="200" y2="18%" stroke="#22d3ee" strokeWidth="0.3"/>
              </svg>
            </div>

            {/* --- LAYER 5: Concentric ring system --- */}
            <div className="absolute bottom-[5%] left-[20px]">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="animate-spin-slow">
                <defs>
                  <radialGradient id="ring-glow-l" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
                  </radialGradient>
                </defs>
                <circle cx="60" cy="60" r="55" fill="url(#ring-glow-l)"/>
                <circle cx="60" cy="60" r="52" stroke="#06b6d4" strokeWidth="0.8" opacity="0.6"/>
                <circle cx="60" cy="60" r="40" stroke="#818cf8" strokeWidth="0.8" strokeDasharray="6 3" opacity="0.5"/>
                <circle cx="60" cy="60" r="28" stroke="#38bdf8" strokeWidth="0.8" opacity="0.7"/>
                <circle cx="60" cy="60" r="16" stroke="#a78bfa" strokeWidth="0.6" opacity="0.6"/>
                <circle cx="60" cy="60" r="6" fill="#38bdf8" opacity="0.8"/>
                <circle cx="60" cy="60" r="10" fill="none" stroke="#38bdf8" strokeWidth="0.5" opacity="0.3" className="animate-ping-slow"/>
              </svg>
            </div>

            {/* --- LAYER 6: Hexagon accent --- */}
            <div className="absolute top-[3%] left-[4%]">
              <svg width="60" height="70" viewBox="0 0 60 70" fill="none" className="animate-pulse-slow">
                <defs>
                  <linearGradient id="hex-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa"/>
                    <stop offset="100%" stopColor="#06b6d4"/>
                  </linearGradient>
                </defs>
                <polygon points="30,2 56,18 56,52 30,68 4,52 4,18" stroke="url(#hex-grad)" strokeWidth="1" fill="rgba(167,139,250,0.05)"/>
                <polygon points="30,14 46,24 46,46 30,56 14,46 14,24" stroke="#38bdf8" strokeWidth="0.6" fill="rgba(56,189,248,0.04)" opacity="0.7"/>
                <polygon points="30,26 38,31 38,41 30,46 22,41 22,31" stroke="#06b6d4" strokeWidth="0.4" fill="rgba(6,182,212,0.03)" opacity="0.5"/>
              </svg>
            </div>

            {/* --- LAYER 7: Vertical light streak --- */}
            <div className="absolute top-[10%] left-[2px] w-[2px] h-[80%] rounded-full overflow-hidden opacity-20">
              <div className="w-full h-[30%] bg-gradient-to-b from-transparent via-cyan-400 to-transparent animate-light-streak"/>
            </div>

            {/* --- LAYER 8: Ambient glow orb --- */}
            <div className="absolute top-[45%] left-[100px] w-[150px] h-[150px] rounded-full animate-pulse-slow"
                 style={{
                   background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, rgba(99,102,241,0.06) 40%, transparent 70%)',
                   filter: 'blur(30px)',
                 }}
            />
          </div>

          {/* ============================================================ */}
          {/* === RIGHT SIDE: Cosmic Universe / Sci-fi City / Nebula / Energy Flows === */}
          {/* ============================================================ */}
          <div className="pointer-events-none fixed right-0 top-0 bottom-0 w-[280px] xl:w-[360px] hidden lg:block z-0" aria-hidden="true">

            {/* --- FAR LAYER: Deep space nebula background --- */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-[5%] right-[-20px] w-[300px] h-[250px] rounded-full animate-nebula-drift"
                   style={{
                     background: 'radial-gradient(ellipse at 40% 50%, rgba(139,92,246,0.18) 0%, rgba(99,102,241,0.08) 30%, rgba(6,182,212,0.04) 60%, transparent 80%)',
                     filter: 'blur(40px)',
                   }}
              />
              <div className="absolute top-[50%] right-[-40px] w-[250px] h-[200px] rounded-full animate-nebula-drift"
                   style={{
                     background: 'radial-gradient(ellipse at 60% 40%, rgba(6,182,212,0.15) 0%, rgba(56,189,248,0.06) 35%, rgba(139,92,246,0.03) 60%, transparent 80%)',
                     filter: 'blur(35px)',
                     animationDelay: '3s',
                   }}
              />
              <div className="absolute bottom-[10%] right-[20px] w-[200px] h-[180px] rounded-full animate-nebula-drift"
                   style={{
                     background: 'radial-gradient(ellipse at 50% 60%, rgba(99,102,241,0.14) 0%, rgba(6,182,212,0.06) 40%, transparent 70%)',
                     filter: 'blur(30px)',
                     animationDelay: '6s',
                   }}
              />
            </div>

            {/* --- MID LAYER: Star field --- */}
            <div className="absolute inset-0">
              {[
                {top:'4%', right:'45px', size:2, opacity:0.7, delay:'0s'},
                {top:'8%', right:'180px', size:1.5, opacity:0.5, delay:'1s'},
                {top:'15%', right:'90px', size:2.5, opacity:0.8, delay:'0.5s'},
                {top:'22%', right:'250px', size:1, opacity:0.4, delay:'2s'},
                {top:'30%', right:'30px', size:2, opacity:0.6, delay:'1.5s'},
                {top:'38%', right:'200px', size:1.5, opacity:0.5, delay:'0.8s'},
                {top:'45%', right:'120px', size:2, opacity:0.7, delay:'2.5s'},
                {top:'52%', right:'280px', size:1, opacity:0.3, delay:'1.2s'},
                {top:'60%', right:'60px', size:2.5, opacity:0.6, delay:'0.3s'},
                {top:'68%', right:'220px', size:1.5, opacity:0.5, delay:'1.8s'},
                {top:'75%', right:'150px', size:2, opacity:0.7, delay:'0.7s'},
                {top:'82%', right:'40px', size:1, opacity:0.4, delay:'2.2s'},
                {top:'88%', right:'260px', size:2, opacity:0.6, delay:'1.3s'},
                {top:'95%', right:'100px', size:1.5, opacity:0.5, delay:'0.6s'},
              ].map((s, i) => (
                <div key={`star-${i}`}
                  className="rounded-full animate-twinkle"
                  style={{
                    top: s.top,
                    right: s.right,
                    width: s.size,
                    height: s.size,
                    backgroundColor: '#e0f2fe',
                    boxShadow: `0 0 ${s.size * 3}px rgba(224,242,254,0.6)`,
                    opacity: s.opacity,
                    animationDelay: s.delay,
                  }}
                />
              ))}
            </div>

            {/* --- MID LAYER: Energy ring / halo system --- */}
            <div className="absolute top-[8%] right-[30px]">
              <svg width="130" height="130" viewBox="0 0 130 130" fill="none" className="animate-spin-slow">
                <defs>
                  <radialGradient id="halo-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25"/>
                    <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.08"/>
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0"/>
                  </radialGradient>
                  <filter id="halo-blur">
                    <feGaussianBlur stdDeviation="1.5" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                <circle cx="65" cy="65" r="60" fill="url(#halo-glow)"/>
                <circle cx="65" cy="65" r="55" stroke="#6366f1" strokeWidth="0.6" opacity="0.5"/>
                <circle cx="65" cy="65" r="45" stroke="#8b5cf6" strokeWidth="0.8" opacity="0.4"/>
                <circle cx="65" cy="65" r="35" stroke="#06b6d4" strokeWidth="1" opacity="0.5"/>
                <circle cx="65" cy="65" r="25" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6"/>
                <circle cx="65" cy="65" r="15" stroke="#a78bfa" strokeWidth="0.6" opacity="0.5"/>
                {/* Arc segments */}
                <path d="M65,10 A55,55 0 0,1 112,35" stroke="#38bdf8" strokeWidth="1.5" fill="none" opacity="0.6" className="animate-draw-radial" filter="url(#halo-blur)"/>
                <path d="M112,35 A55,55 0 0,1 112,95" stroke="#8b5cf6" strokeWidth="1.5" fill="none" opacity="0.5" className="animate-draw-radial" style={{animationDelay: '0.5s'}} filter="url(#halo-blur)"/>
                <path d="M112,95 A55,55 0 0,1 65,120" stroke="#06b6d4" strokeWidth="1.5" fill="none" opacity="0.6" className="animate-draw-radial" style={{animationDelay: '1s'}} filter="url(#halo-blur)"/>
                <path d="M65,120 A55,55 0 0,1 18,95" stroke="#a78bfa" strokeWidth="1.2" fill="none" opacity="0.4" className="animate-draw-radial" style={{animationDelay: '1.5s'}} filter="url(#halo-blur)"/>
                <path d="M18,95 A55,55 0 0,1 18,35" stroke="#22d3ee" strokeWidth="1.2" fill="none" opacity="0.5" className="animate-draw-radial" style={{animationDelay: '2s'}} filter="url(#halo-blur)"/>
                <path d="M18,35 A55,55 0 0,1 65,10" stroke="#38bdf8" strokeWidth="1.5" fill="none" opacity="0.6" className="animate-draw-radial" style={{animationDelay: '2.5s'}} filter="url(#halo-blur)"/>
                <circle cx="65" cy="65" r="4" fill="#38bdf8" opacity="0.9"/>
                <circle cx="65" cy="65" r="8" fill="none" stroke="#38bdf8" strokeWidth="0.5" opacity="0.3" className="animate-ping-slow"/>
              </svg>
            </div>

            {/* --- MID LAYER: Floating glass panel (SYS.ACTIVE) --- */}
            <div className="absolute top-[35%] right-[25px] w-[140px] backdrop-blur-md bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-cyan-500/20 rounded-xl p-3 animate-float-slow shadow-lg shadow-cyan-500/10"
                 style={{animationDelay: '1s'}}>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] text-cyan-400 font-mono font-bold tracking-wider">SYS.ACTIVE</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                </div>
                <div className="h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"/>
                {[68, 42, 85, 57, 73].map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[7px] text-slate-500 font-mono w-4">{`M${i+1}`}</span>
                    <div className="flex-1 h-[3px] bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500/50 to-purple-500/40"
                        style={{width: `${v}%`, animationDelay: `${i * 0.2}s`}}
                      />
                    </div>
                    <span className="text-[7px] text-slate-400 font-mono w-5 text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* --- NEAR LAYER: Neon wave graph --- */}
            <div className="absolute top-[58%] right-[15px] w-[200px]">
              <svg width="200" height="80" viewBox="0 0 200 80" fill="none">
                <defs>
                  <linearGradient id="neon-fill-r2" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
                  </linearGradient>
                  <linearGradient id="neon-stroke-r2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4"/>
                    <stop offset="40%" stopColor="#3b82f6"/>
                    <stop offset="70%" stopColor="#8b5cf6"/>
                    <stop offset="100%" stopColor="#c084fc"/>
                  </linearGradient>
                  <filter id="wave-glow">
                    <feGaussianBlur stdDeviation="2" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                <path d="M0,60 C18,55 30,30 50,35 C70,40 80,18 100,22 C120,26 130,50 150,38 C170,26 185,12 200,18 V80 H0 Z"
                  fill="url(#neon-fill-r2)"/>
                <path d="M0,60 C18,55 30,30 50,35 C70,40 80,18 100,22 C120,26 130,50 150,38 C170,26 185,12 200,18"
                  stroke="url(#neon-stroke-r2)" strokeWidth="2" fill="none" strokeLinecap="round"
                  filter="url(#wave-glow)" className="animate-draw-wave"/>
                {[[50,35],[100,22],[150,38],[200,18]].map(([cx, cy], i) => (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r="3" fill="#a78bfa" className={i===1 ? 'animate-pulse' : ''}/>
                    <circle cx={cx} cy={cy} r="6" fill="none" stroke="#a78bfa" strokeWidth="0.5" opacity="0.3"/>
                  </g>
                ))}
              </svg>
            </div>

            {/* --- NEAR LAYER: Particle energy streams --- */}
            <ParticleFieldRight particles={[
              {top:'10%', right:'55px', size:4, delay:'0.5s', color:'#8b5cf6'},
              {top:'18%', right:'180px', size:3, delay:'1.8s', color:'#a78bfa'},
              {top:'28%', right:'100px', size:5, delay:'0.3s', color:'#06b6d4'},
              {top:'35%', right:'250px', size:3, delay:'2.2s', color:'#22d3ee'},
              {top:'42%', right:'40px', size:4, delay:'1.1s', color:'#38bdf8'},
              {top:'50%', right:'200px', size:3, delay:'0.7s', color:'#6366f1'},
              {top:'58%', right:'130px', size:5, delay:'1.5s', color:'#c084fc'},
              {top:'65%', right:'270px', size:3, delay:'2.0s', color:'#06b6d4'},
              {top:'72%', right:'70px', size:4, delay:'0.9s', color:'#38bdf8'},
              {top:'80%', right:'210px', size:3, delay:'1.3s', color:'#8b5cf6'},
              {top:'88%', right:'160px', size:4, delay:'0.4s', color:'#22d3ee'},
              {top:'94%', right:'30px', size:3, delay:'2.5s', color:'#3b82f6'},
            ]}/>

            {/* --- NEAR LAYER: DATA_STREAM card --- */}
            <div className="absolute bottom-[12%] right-[35px] w-[120px] backdrop-blur-sm bg-gradient-to-br from-indigo-900/40 to-purple-900/30 border border-violet-500/20 rounded-lg p-2.5 animate-float shadow-lg shadow-indigo-500/10"
                 style={{animationDelay: '2s'}}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                <span className="text-[7px] text-emerald-400 font-mono font-bold tracking-wider">DATA_STREAM</span>
              </div>
              <div className="grid grid-cols-4 gap-[2px]">
                {streamGrid.map((bg, i) => (
                  <div key={i} 
                    className="aspect-square rounded-sm"
                    style={{ background: bg }}
                  />
                ))}
              </div>
            </div>

            {/* --- NEAR LAYER: Vertical neon bars (multiple) --- */}
            <div className="absolute top-[20%] right-[6px] w-[3px] h-[130px] rounded-full overflow-hidden bg-white/5 border border-white/5">
              <div className="w-full h-[60%] bg-gradient-to-b from-cyan-400 via-blue-500 to-violet-500 rounded-full animate-neon-bar"/>
            </div>
            <div className="absolute top-[55%] right-[12px] w-[2px] h-[80px] rounded-full overflow-hidden bg-white/5">
              <div className="w-full h-[55%] bg-gradient-to-b from-purple-400 via-fuchsia-500 to-cyan-400 rounded-full animate-neon-bar" style={{animationDelay: '2s'}}/>
            </div>

            {/* --- NEAR LAYER: Triangle accent --- */}
            <div className="absolute top-[3%] right-[7%]">
              <svg width="50" height="58" viewBox="0 0 50 58" fill="none" className="animate-pulse-slow">
                <defs>
                  <linearGradient id="tri-grad" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#c084fc"/>
                    <stop offset="100%" stopColor="#06b6d4"/>
                  </linearGradient>
                </defs>
                <polygon points="25,2 48,56 2,56" stroke="url(#tri-grad)" strokeWidth="1" fill="rgba(192,132,252,0.06)"/>
                <polygon points="25,16 38,44 12,44" stroke="#38bdf8" strokeWidth="0.6" fill="rgba(56,189,248,0.04)" opacity="0.7"/>
                <polygon points="25,28 32,38 18,38" stroke="#06b6d4" strokeWidth="0.4" fill="rgba(6,182,212,0.03)" opacity="0.5"/>
              </svg>
            </div>

            {/* --- DECORATION: Sci-fi city silhouette (bottom) --- */}
            <div className="absolute bottom-0 right-0 w-full">
              <svg width="100%" height="80" viewBox="0 0 360 80" preserveAspectRatio="none" fill="none" className="opacity-[0.08]">
                <defs>
                  <linearGradient id="city-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0,80 L0,55 L20,55 L20,40 L30,40 L30,50 L45,50 L45,25 L55,25 L55,35 L65,35 L65,50 L80,50 L80,30 L90,30 L90,20 L95,15 L100,20 L100,30 L110,30 L110,55 L130,55 L130,45 L140,45 L140,35 L150,35 L150,50 L170,50 L170,22 L180,22 L180,10 L185,5 L190,10 L190,22 L200,22 L200,40 L215,40 L215,55 L230,55 L230,45 L240,45 L240,30 L250,30 L250,50 L270,50 L270,35 L280,35 L280,18 L285,12 L290,18 L290,35 L300,35 L300,50 L320,50 L320,40 L330,40 L330,55 L345,55 L345,45 L360,45 L360,80 Z"
                  fill="url(#city-grad)"/>
              </svg>
            </div>

            {/* --- DECORATION: Horizontal light band --- */}
            <div className="absolute top-[46%] right-0 w-[80%] h-[1px]">
              <div className="w-full h-full bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent animate-light-band"/>
            </div>
            <div className="absolute top-[47%] right-0 w-[60%] h-[1px]">
              <div className="w-full h-full bg-gradient-to-r from-transparent via-purple-400/20 to-transparent animate-light-band" style={{animationDelay: '3s'}}/>
            </div>

            {/* --- DECORATION: Vertical light streak --- */}
            <div className="absolute top-[5%] right-[3px] w-[2px] h-[90%] rounded-full overflow-hidden opacity-20">
              <div className="w-full h-[25%] bg-gradient-to-b from-transparent via-purple-400 to-transparent animate-light-streak" style={{animationDelay: '2s'}}/>
            </div>
          </div>

          {/* === CENTER: Enhanced ambient glow === */}
          <div className="fixed inset-0 pointer-events-none z-0 hidden lg:block" aria-hidden="true">
            {/* Primary central glow */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px]"
                 style={{
                   background: 'radial-gradient(ellipse at center, rgba(56,189,248,0.08) 0%, rgba(99,102,241,0.04) 35%, transparent 65%)',
                   filter: 'blur(60px)',
                 }}
            />
            {/* Secondary warm accent */}
            <div className="absolute left-[40%] top-[30%] w-[400px] h-[300px]"
                 style={{
                   background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.06) 0%, transparent 60%)',
                   filter: 'blur(50px)',
                 }}
            />
            {/* Bottom accent */}
            <div className="absolute left-[55%] bottom-[10%] w-[500px] h-[300px]"
                 style={{
                   background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.05) 0%, transparent 55%)',
                   filter: 'blur(45px)',
                 }}
            />
          </div>

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
