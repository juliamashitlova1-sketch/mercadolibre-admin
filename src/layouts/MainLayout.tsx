import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { SKUStats } from '../types';
import { STOCK_HEALTH_THRESHOLD } from '../constants';
import {
  LayoutDashboard, Package, ShoppingCart, 
  Archive, TrendingUp, Crosshair, 
  DollarSign, AlertTriangle, Activity,
  Search, Bell, Command, Settings, PlusCircle, Compass
} from 'lucide-react';
import { getMexicoTimeString } from '../lib/time';

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

interface LayoutProps {
  skuData: SKUStats[];
  onAddSku: () => void;
}

export default function MainLayout({ skuData, onAddSku }: LayoutProps) {
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
    { id: '/competitors', label: '竞品监控', icon: Crosshair },
    { id: '/finance', label: '财务报表', icon: DollarSign },
    { id: '/health', label: '账号健康', icon: AlertTriangle },
    { id: '/operations', label: '操作日志', icon: Activity },
  ];

  return (
    <div className="flex h-screen bg-transparent overflow-hidden selection:bg-sky-100 selection:text-sky-900">
      {/* Floating Sidebar */}
      <div className="hidden md:flex p-4 pr-0 h-full w-[260px]">
        <aside className="w-full h-full glass-panel rounded-2xl flex flex-col relative z-20 overflow-hidden">
          <div className="px-6 pt-8 pb-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shadow-sm">
              <MilyflyLogo className="w-6 h-6" />
            </div>
            <div className="font-extrabold text-xl text-slate-800 tracking-tight font-heading mt-1">
              MILYFLY
            </div>
          </div>
          
          <nav className="flex-1 flex flex-col gap-1 px-4 overflow-y-auto hidden-scrollbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.id}
                  to={item.id}
                  className={({ isActive }) => `
                    w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group
                    ${isActive 
                      ? 'bg-sky-50 text-sky-600 border border-sky-100 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-[18px] h-[18px] opacity-80 group-hover:opacity-100 transition-opacity" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && item.badge === '需补货' && (
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="p-4 mt-auto">
            <div className="glass-card rounded-xl p-4 relative overflow-hidden group transition-colors cursor-pointer">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mb-1.5 flex items-center justify-between">
                <span>管理员</span>
                <Settings className="w-3 h-3 text-slate-400 group-hover:text-slate-700 transition-colors hover:rotate-90 duration-500" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  JC
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">Juan Carlos</div>
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
          <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
            <span>MILYFLY 控制台</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 capitalize font-semibold">{location.pathname === '/' ? '总览看板' : location.pathname.substring(1).replace('-', ' ')}</span>
            <div className="ml-4 flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 rounded-full shadow-sm text-sky-700 text-xs font-mono font-bold tracking-tight">
              <Compass className="w-3.5 h-3.5 animate-pulse text-sky-500" />
              <span>墨西哥当地时间：{currentTime}</span>
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
