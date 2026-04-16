import { motion } from 'motion/react';
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  trend: {
    value: string;
    isUp: boolean;
  };
  icon: React.ReactNode;
  description: string;
  inverseTrend?: boolean;
}

export function StatCard({ title, value, trend, icon, description, inverseTrend = false }: StatCardProps) {
  const isPositiveTrend = trend.isUp;
  const isGoodTrend = inverseTrend ? !isPositiveTrend : isPositiveTrend;
  const trendColor = isGoodTrend ? 'text-success' : 'text-danger';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="stat-card"
    >
      <div className="flex justify-between items-start mb-1">
        <div className="stat-label">{title}</div>
        <div className="p-1.5 bg-bg rounded-lg">{icon}</div>
      </div>
      <div className="stat-value">
        {value} <span className="text-[12px] text-text-sub font-normal ml-1">{description.includes('MXN') ? 'MXN' : ''}</span>
      </div>
      <div className={`stat-change ${trendColor}`}>
        {isPositiveTrend ? '↑' : '↓'} {trend.value} <span className="text-text-sub ml-1">vs 昨日</span>
      </div>
      {!description.includes('MXN') && (
        <div className="text-[10px] text-text-sub mt-2 font-medium uppercase tracking-tight">
          {description}
        </div>
      )}
    </motion.div>
  );
}
