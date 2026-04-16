import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DailyStats } from '../types';
import { DEFAULT_EXCHANGE_RATE } from '../constants';
import { useOutletContext } from 'react-router-dom';

interface ContextType {
  dailyData: DailyStats[];
}

export default function Finance() {
  const { dailyData } = useOutletContext<ContextType>();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold text-text-main">财务与结算台账</h2>
        <p className="text-text-sub text-sm">每日盈亏核算、汇率监控与利润分析</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-label">本月累计净利润 (估算)</div>
          <div className="stat-value text-success">${dailyData.length > 0 ? dailyData.reduce((s,d)=>s+((d.totalSales*0.3)-d.adSpend),0).toLocaleString() : '0'} <span className="text-xs font-normal text-text-sub">MXN</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">平均利润率</div>
          <div className="stat-value">{dailyData.length > 0 ? ((dailyData.reduce((s,d)=>s+((d.totalSales*0.3)-d.adSpend),0) / dailyData.reduce((s,d)=>s+d.totalSales,1)) * 100).toFixed(1) : '0'}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">实时汇率 (MXN/CNY)</div>
          <div className="stat-value text-primary">{DEFAULT_EXCHANGE_RATE}</div>
        </div>
      </div>

      <Card className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold">每日财务明细</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>总销售额 (MXN)</TableHead>
                <TableHead>广告支出 (MXN)</TableHead>
                <TableHead>预估净利润 (MXN)</TableHead>
                <TableHead>利润率</TableHead>
                <TableHead className="text-right">状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyData.slice().reverse().map((day) => {
                const profit = day.calculatedProfit !== undefined ? day.calculatedProfit : (day.totalSales * 0.3 - day.adSpend);
                const margin = profit / (day.totalSales || 1);
                return (
                  <TableRow key={day.date}>
                    <TableCell className="text-xs">{day.date}</TableCell>
                    <TableCell className="text-xs font-medium">${day.totalSales.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-rose-500">-${day.adSpend.toLocaleString()}</TableCell>
                    <TableCell className={`text-xs font-bold ${profit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ${profit.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">{(margin * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-[9px]">
                        {day.calculatedProfit !== undefined ? '精准核算' : '估算'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
