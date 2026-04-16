import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DailyStats, SKUStats } from '../types';
import { useOutletContext } from 'react-router-dom';

interface ContextType {
  dailyData: DailyStats[];
  skuData: SKUStats[];
}

export default function Orders() {
  const { dailyData, skuData } = useOutletContext<ContextType>();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold text-text-main">订单与销售明细</h2>
        <p className="text-text-sub text-sm">追踪每日订单总量、单品出单分布及销售转化</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-label">今日总订单量</div>
          <div className="stat-value">{dailyData[dailyData.length - 1]?.totalOrders || 0} <span className="text-xs font-normal text-text-sub">单</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">今日客单价 (AOV)</div>
          <div className="stat-value text-primary">
            ${((dailyData[dailyData.length - 1]?.totalSales || 0) / (dailyData[dailyData.length - 1]?.totalOrders || 1)).toFixed(2)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">出单 SKU 数</div>
          <div className="stat-value text-success">{skuData.filter(s => s.orders > 0).length}</div>
        </div>
      </div>

      <Card className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold">今日单品出单排行</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>SKU 信息</TableHead>
                <TableHead>当日销量 (MXN)</TableHead>
                <TableHead>当日订单 (单)</TableHead>
                <TableHead>单品贡献度</TableHead>
                <TableHead className="text-right">转化率 (估)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skuData
                .filter(s => s.orders > 0)
                .sort((a, b) => b.orders - a.orders)
                .map((sku) => {
                  const totalOrders = dailyData[dailyData.length - 1]?.totalOrders || 1;
                  const contribution = (sku.orders / totalOrders) * 100;
                  const conversion = (sku.orders / (sku.clicks || 1)) * 100;
                  return (
                    <TableRow key={sku.sku}>
                      <TableCell>
                        <div className="font-mono text-xs font-bold">{sku.sku}</div>
                        <div className="text-[10px] text-text-sub">{sku.skuName}</div>
                      </TableCell>
                      <TableCell className="text-xs">${sku.sales.toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-bold">{sku.orders}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${contribution}%` }} />
                          </div>
                          <span className="text-[10px] w-8">{contribution.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {conversion.toFixed(1)}%
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
