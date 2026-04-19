import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { SKUStats } from '../types';
import logo from '../assets/logo.png';
import { STOCK_HEALTH_THRESHOLD } from '../constants';
import {
  LayoutDashboard, Package, ShoppingCart, 
  Archive, TrendingUp, Crosshair, 
  DollarSign, AlertTriangle, Activity,
  Search, Bell, Command, Settings, PlusCircle, Compass, Brain, Calculator, History, CheckCircle, Inbox,
  CreditCard, PackageX
} from 'lucide-react';
import { getMexicoTimeString } from '../lib/time';
import DataExporter from '../components/DataExporter';

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
  uiVersion: 'v1' | 'v2';
  onToggleUi: () => void;
  onAddSku: () => void;
}

export default function MainLayout({ 
  skuData, dailyData, fakeOrders, cargoDamage, 
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

  const inventoryStatus = skuData && skuData.length > 0
    ? skuData.filter(s => Math.floor(s.stock / (s.avgSalesSinceListing || 1)) < STOCK_HEALTH_THRESHOLD).length > 0
      ? '需补货'
      : '正常'
    : '空';

  const menuItems = [
    { id: '/', label: '总览看板', icon: LayoutDashboard },
    { id: '/sku-manage', label: 'SKU 管理', icon: Package },
    { id: '/orders', label: '订单管理', icon: ShoppingCart },
    { id: '/inventory', label: '库存管理', icon: Archive, badge: inventoryStatus },
    { id: '/ads', label: '广告优化', icon: TrendingUp },
    { id: '/fake-orders', label: '刷单支出', icon: CreditCard },
    { id: '/cargo-damage', label: '货损支出', icon: PackageX },
    { id: '/competitors', label: '竞品监控', icon: Crosshair },
    { id: '/finance', label: '财务报表', icon: DollarSign },
    { id: '/health', label: '账号健康', icon: AlertTriangle },
    { id: '/operations', label: '操作日志', icon: Activity },
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
            {menuItems.map((item) => {
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
                  {item.children && isPricingActive && (
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

          <div className="p-4 mt-auto">
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
                  <div className="text-[10px] text-slate-500 font-mono tracking-wider">Store Manager</div>
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
            <span>MILYFLY 控制台</span>
            <span className="text-slate-300">/</span>
            <span className={`capitalize font-semibold ${uiVersion === 'v2' ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]' : 'text-slate-800'}`}>{location.pathname === '/' ? '总览看板' : location.pathname.substring(1).split('/')[0].replace('-', ' ')}</span>
            
            <div className="ml-4 flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-sm text-xs font-mono font-bold tracking-tight border ${uiVersion === 'v2' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' : 'bg-gradient-to-r from-sky-50 to-indigo-50 border-sky-100 text-sky-700'}`}>
                <Compass className={`w-3.5 h-3.5 animate-pulse ${uiVersion === 'v2' ? 'text-sky-300' : 'text-sky-500'}`} />
                <span>墨西哥当地时间：{currentTime}</span>
              </div>
              
              {/* 汇率转换小工具 */}
              <div className="flex items-center bg-white border border-slate-200 rounded-full px-2 py-0.5 shadow-sm overflow-hidden h-[28px]">
                 <CurrencyConverter />
              </div>

              {/* 全局数据导出 */}
              <DataExporter 
                skuData={skuData} 
                dailyData={dailyData} 
                fakeOrders={fakeOrders} 
                cargoDamage={cargoDamage} 
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 glass-panel shadow-none h-10 px-4 rounded-full text-sm text-slate-400 focus-within:text-slate-700 transition-colors cursor-text group w-[240px]">
              <Search className="w-4 h-4 opacity-70 group-focus-within:opacity-100 group-focus-within:text-sky-500" />
              <input 
                type="text" 
                placeholder="搜索 SKU 或 订单号..." 
                className="flex-1 text-xs bg-transparent outline-none placeholder:text-slate-400 text-slate-800"
              />
              <kbd className="hidden group-hover:flex items-center h-5 px-1.5 text-[10px] font-mono bg-slate-100 rounded font-medium text-slate-500 border border-slate-200">⌘K</kbd>
            </div>
            
            <button className="relative w-10 h-10 rounded-full glass-panel shadow-none flex items-center justify-center hover:bg-slate-50 transition-colors group">
              <Bell className="w-[18px] h-[18px] text-slate-500 group-hover:text-slate-800 transition-colors" />
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            </button>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto px-4 md:px-8 pb-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto min-h-full animate-slide-in-right">
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
