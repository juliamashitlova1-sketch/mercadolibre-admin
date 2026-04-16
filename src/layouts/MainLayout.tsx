import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { format } from 'date-fns';
import { SKUStats } from '../types';
import { STOCK_HEALTH_THRESHOLD } from '../constants';

interface LayoutProps {
  skuData: SKUStats[];
  onAddSku: () => void;
}

export default function MainLayout({ skuData, onAddSku }: LayoutProps) {
  const [currentTime, setCurrentTime] = useState(format(new Date(), 'HH:mm:ss'));

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
    { id: '/', label: '核心大盘仪表盘' },
    { id: '/sku-manage', label: 'SKU 每日管理' },
    { id: '/orders', label: '订单与销售明细' },
    { id: '/inventory', label: `库存与供应链 (${inventoryStatus})` },
    { id: '/ads', label: '广告分析与调优' },
    { id: '/competitors', label: '竞品监控中心' },
    { id: '/finance', label: '财务与结算台账' },
    { id: '/health', label: '账号申诉/纠纷处理' },
    { id: '/operations', label: '运营操作日志' },
  ];

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="w-[200px] bg-sidebar text-white flex flex-col py-5 shrink-0 hidden md:flex">
        <div className="px-6 pb-8 font-extrabold text-lg text-[#FFDB15] tracking-tighter">
          MERCADO MX OPS
        </div>
        <nav className="flex-1 flex flex-col">
          {menuItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.id}
              className={({ isActive }) => `
                w-full flex items-center gap-2.5 px-6 py-3 text-[13px] transition-all text-left
                ${isActive ? 'bg-[#334155] text-white border-r-4 border-primary' : 'text-[#94A3B8] hover:text-white hover:bg-[#334155]/50'}
              `}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-6 text-[11px] text-text-sub border-t border-white/10 mt-auto">
          主管: Juan Carlos<br />
          当前时间: {currentTime}
        </div>
      </aside>

      <main className="flex-1 flex flex-col p-6 gap-5 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
