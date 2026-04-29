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
import appBg from '../assets/app-bg.png';



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


interface LayoutProps {
  skuData: SKUStats[];
  dailyData: any[];
  fakeOrders: any[];
  cargoDamage: any[];
  operationLogs: any[];
  uiVersion: 'v2';
  onAddSku: () => void;
}


export default function MainLayout({ 
  skuData, dailyData, fakeOrders, cargoDamage, operationLogs,
  uiVersion, onAddSku 
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
    { id: '/sku-management', label: 'SKU数据总览', icon: Package },
    { id: '/sku-cost-management', label: 'SKU成本管理', icon: DollarSign, color: 'text-amber-500' },
    { id: '/fake-orders', label: '刷单支出', icon: CreditCard },
    { id: '/cargo-damage', label: '货损支出', icon: PackageX },
    { id: '/health', label: '账号健康', icon: AlertTriangle },
    { id: '/operations', label: '运营动作', icon: Activity },
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
    <div className="flex h-screen overflow-hidden selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-700 bg-[#f8fafc] text-slate-900">
      {/* Full App Prism Glass Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Animated Mesh Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse-slow" />
        <div className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[50%] bg-sky-500/10 blur-[140px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
        
        {/* Subtle Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      {/* Floating Sidebar */}
      <div className="hidden md:flex p-4 pr-0 h-full w-[280px]">
        <aside className="w-full h-full glass-panel rounded-[2rem] flex flex-col relative z-20 overflow-hidden border-white/50">
          <div className="px-8 pt-10 pb-8 flex items-center gap-4 cursor-default group">
            <div className="w-10 h-10 rounded-xl bg-white shadow-[0_8px_20px_-4px_rgba(99,102,241,0.2)] flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
              <MilyflyLogo className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-2xl tracking-tighter text-slate-900">MILYFLY</div>
              <div className="text-[10px] font-bold text-indigo-500/60 uppercase tracking-[0.2em] -mt-1">Analytics Pro</div>
            </div>
          </div>
          
          <nav className="flex-1 flex flex-col gap-1.5 px-5 overflow-y-auto hidden-scrollbar">
            {menuItems.map((item: any) => {
              const Icon = item.icon;
              const isPricingActive = location.pathname.startsWith('/pricing');
              const isActive = item.children ? isPricingActive : location.pathname === item.id;
              
              return (
                <div key={item.id} className="flex flex-col gap-1">
                  <NavLink
                    to={item.children ? item.children[0].id : item.id}
                    className={() => `
                      w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl text-[13px] font-bold transition-all duration-300 group
                      ${isActive 
                        ? 'bg-indigo-600 text-white shadow-[0_10px_25px_-5px_rgba(99,102,241,0.4)] scale-[1.02]' 
                        : 'text-slate-500 hover:text-indigo-600 hover:bg-white/40'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'opacity-60 group-hover:opacity-100'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && item.badge === '需补货' && (
                      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-rose-500'} animate-pulse`} />
                    )}
                  </NavLink>

                  {/* Sub-menu items */}
                  {item.children && (item.id === '/pricing' ? isPricingActive : location.pathname.startsWith(item.id)) && (
                    <div className="flex flex-col gap-1.5 ml-8 mt-1 mb-3 border-l-2 border-indigo-500/20 pl-4">
                      {item.children.map(child => {
                        const ChildIcon = child.icon;
                        const isChildActive = location.pathname === child.id;
                        return (
                          <NavLink
                            key={child.id}
                            to={child.id}
                            className={() => `
                              flex items-center gap-3 py-2 text-[12px] font-bold transition-all
                              ${isChildActive ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-500'}
                            `}
                          >
                            <ChildIcon className={`w-4 h-4 ${isChildActive ? 'animate-pulse' : ''}`} />
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

          <div className="p-6 mt-auto">
            <div className="glass-card rounded-2xl p-4 border-white/60 hover:border-indigo-500/20 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-black shadow-lg">
                  JC
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-black text-slate-900 truncate">Juan Carlos</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Administrator</div>
                </div>
                <Settings className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-all hover:rotate-90" />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-[88px] shrink-0 flex items-center justify-between px-10 z-10">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-white/40 backdrop-blur-md rounded-full border border-white/60 shadow-sm text-[10px] font-black text-indigo-600 uppercase tracking-widest">
              Console
            </div>
            <div className="h-4 w-px bg-slate-200/50" />
            <h2 className="text-sm font-black text-slate-900 tracking-tight capitalize">
              {location.pathname === '/' ? 'Overview' : location.pathname.substring(1).split('/')[0].replace(/-/g, ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center bg-white/50 backdrop-blur-xl border border-white/60 rounded-full px-4 h-11 shadow-sm gap-4">
               <CurrencyConverter />
            </div>

            <div className="hidden xl:flex items-center gap-3">
              <DataExporter skuData={skuData} />
              
              <div className="w-10 h-10 rounded-full glass-panel flex items-center justify-center group cursor-pointer hover:bg-white/60 transition-all">
                <Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
              </div>
              
              <button 
                onClick={() => {
                  setIsNotificationOpen(!isNotificationOpen);
                  if (appUpdates.length > 0) localStorage.setItem('milyfly_last_seen_version', appUpdates[0].version);
                  setHasNewUpdate(false);
                }}
                className={`relative w-10 h-10 rounded-full glass-panel flex items-center justify-center transition-all ${isNotificationOpen ? 'bg-indigo-600 shadow-indigo-500/40' : 'hover:bg-white/60'}`}
              >
                <Bell className={`w-4 h-4 transition-colors ${isNotificationOpen ? 'text-white' : 'text-slate-400'}`} />
                {hasNewUpdate && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-bounce" />
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
                      className="absolute right-0 mt-3 w-[320px] bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
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
