import React from 'react';
import { motion } from 'motion/react';
import { DollarSign, Percent, AlertOctagon, XCircle } from 'lucide-react';

const Card = ({ title, value, icon, gradient, delay = 0, subTitle }: any) => (
  <motion.div

    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="glass-card p-6 flex flex-col justify-between h-36"
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm text-gray-400 font-medium">{title}</p>
        <h3 className={`text-3xl font-bold mt-2 bg-clip-text text-transparent bg-gradient-to-r ${gradient}`}>
          {value}
        </h3>
      </div>
      <div className={`p-3 rounded-xl bg-white/5 border border-white/10`}>
        {icon}
      </div>
    </div>
    {subTitle && (
      <div className="mt-4 text-xs text-gray-500 font-medium">
        {subTitle}
      </div>
    )}
  </motion.div>
);

export default function MetricsGrid({ metrics }: { metrics: any }) {

  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 w-full">
      <Card
        title="有效销售额 (USD/MXN)"
        value={`$${(metrics.totalRevenueUSD || 0).toLocaleString()}`}
        subTitle={`MXN: ${(metrics.totalRevenueMXN || 0).toLocaleString()}`}
        icon={<DollarSign className="w-6 h-6 text-green-400" />}
        gradient="from-green-400 to-emerald-600"
        delay={0.1}
      />
      <Card
        title="有效订单总数"
        value={(metrics.totalOrders || 0).toLocaleString()}
        icon={<Percent className="w-6 h-6 text-blue-400" />}
        gradient="from-blue-400 to-indigo-600"
        delay={0.2}
      />
      <Card
        title="退货总损失 (USD)"
        value={`-$${(metrics.refundLossUSD || 0).toLocaleString()}`}
        subTitle={`共 ${metrics.refundCount || 0} 笔退款单`}
        icon={<AlertOctagon className="w-6 h-6 text-orange-400" />}
        gradient="from-orange-400 to-red-500"
        delay={0.3}
      />
      <Card
        title="取消总损失 (USD)"
        value={`-$${(metrics.cancelLossUSD || 0).toLocaleString()}`}
        subTitle={`共 ${metrics.cancelCount || 0} 笔取消单`}
        icon={<XCircle className="w-6 h-6 text-red-500" />}
        gradient="from-red-500 to-rose-700"
        delay={0.4}
      />
    </div>
  );
};
