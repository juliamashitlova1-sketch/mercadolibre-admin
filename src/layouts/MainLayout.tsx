import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { SKUStats } from '../types';
import { STOCK_HEALTH_THRESHOLD } from '../constants';
import {
  LayoutDashboard, Package, ShoppingCart, 
  Archive, TrendingUp, Crosshair, 
  DollarSign, AlertTriangle, Activity,
  Search, Bell, Command, Settings
} from 'lucide-react';

interface LayoutProps {
  skuData: SKUStats[];
  onAddSku: () => void;
}

export default function MainLayout({ skuData }: LayoutProps) {
  const [currentTime, setCurrentTime] = useState(format(new Date(), 'HH:mm:ss'));
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(format(new Date(), 'HH:mm:ss'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const inventoryStatus = skuData && skuData.length > 0
    ? skuData.filter(s => Math.floor(s.stock / (s.avgSalesSinceListing || 1)) < STOCK_HEALTH_THRESHOLD).length > 0
      ? '需补货'
      : '正常'
    : '空';

  const menuItems = [
    { id: '/', label: 'Overview', icon: LayoutDashboard },
    { id: '/sku-manage', label: 'SKU Manage', icon: Package },
    { id: '/orders', label: 'Orders', icon: ShoppingCart },
    { id: '/inventory', label: 'Inventory', icon: Archive, badge: inventoryStatus },
    { id: '/ads', label: 'Ads Tuning', icon: TrendingUp },
    { id: '/competitors', label: 'Competitors', icon: Crosshair },
    { id: '/finance', label: 'Finance', icon: DollarSign },
    { id: '/health', label: 'Health', icon: AlertTriangle },
    { id: '/operations', label: 'Logs', icon: Activity },
  ];

  return (
    <div className="flex h-screen bg-transparent overflow-hidden selection:bg-primary/30">
      {/* Floating Sidebar */}
      <div className="hidden md:flex p-4 pr-0 h-full w-[260px]">
        <aside className="w-full h-full glass-panel rounded-2xl flex flex-col relative z-20 overflow-hidden">
          <div className="px-6 pt-8 pb-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-indigo-400 flex items-center justify-center shadow-lg shadow-primary/20">
              <Command className="w-4 h-4 text-white" />
            </div>
            <div className="font-extrabold text-lg text-white tracking-tight font-heading">
              MELÉ MX
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
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-inner' 
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'}
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
            <div className="glass-card rounded-xl p-4 border-white/5 relative overflow-hidden group hover:border-primary/30 transition-colors cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mb-1.5 flex items-center justify-between">
                <span>Manager</span>
                <Settings className="w-3 h-3 text-slate-400 group-hover:text-primary transition-colors hover:rotate-90 duration-500" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                  JC
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Juan Carlos</div>
                  <div className="text-[10px] text-slate-400 font-mono tracking-wider">{currentTime}</div>
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
          <div className="flex items-center gap-2 text-slate-400 font-medium text-sm">
            <span>MELÉ MX</span>
            <span className="text-slate-600">/</span>
            <span className="text-white capitalize">{location.pathname === '/' ? 'Overview' : location.pathname.substring(1).replace('-', ' ')}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 glass-panel h-10 px-4 rounded-full border border-white/5 text-sm text-slate-400 hover:text-white transition-colors cursor-text group w-[240px]">
              <Search className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:text-primary" />
              <span className="flex-1 text-xs opacity-70 group-hover:opacity-100">Search SKU or order...</span>
              <kbd className="hidden group-hover:flex items-center h-5 px-1.5 text-[10px] font-mono bg-white/10 rounded font-medium text-slate-300">⌘K</kbd>
            </div>
            
            <button className="relative w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 transition-colors border-white/5 hover:border-primary/30 group">
              <Bell className="w-[18px] h-[18px] text-slate-400 group-hover:text-white transition-colors" />
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-background animate-pulse" />
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
