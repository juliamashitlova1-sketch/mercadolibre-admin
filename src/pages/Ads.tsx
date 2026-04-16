import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DailyStats, SKUStats } from '../types';
import { useOutletContext } from 'react-router-dom';

interface ContextType {
  dailyData: DailyStats[];
  skuData: SKUStats[];
}

export default function Ads() {
  const { dailyData, skuData } = useOutletContext<ContextType>();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold text-text-main">广告分析与调优 (Mercado Ads)</h2>
        <p className="text-text-sub text-sm">监控广告投放效果，优化 ACOS 与关键词竞价</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label">今日总广告费</div>
          <div className="stat-value">${dailyData.length > 0 ? dailyData.reduce((s, d) => s + d.adSpend, 0).toLocaleString() : '0'} <span className="text-xs font-normal text-text-sub">MXN</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">整体 ACOS</div>
          <div className="stat-value text-primary">{dailyData.length > 0 ? ((dailyData.reduce((s,d)=>s+d.adSpend,0) / dailyData.reduce((s,d)=>s+d.totalSales,1)) * 100).toFixed(1) : '0'}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">整体 ROAS</div>
          <div className="stat-value text-success">{dailyData.length > 0 ? (dailyData.reduce((s,d)=>s+d.totalSales,0) / (dailyData.reduce((s,d)=>s+d.adSpend,0)||1)).toFixed(2) : '0'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">平均 CTR</div>
          <div className="stat-value">{skuData.length > 0 ? ((skuData.reduce((s,d)=>s+(d.clicks||0),0) / (skuData.reduce((s,d)=>s+(d.impressions||0),0)||1)) * 100).toFixed(1) : '0'}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-border shadow-sm bg-card rounded-xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold">广告费 vs 销售额趋势</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="totalSales" stroke="#2D5CFE" strokeWidth={2} name="销售额" />
                <Line type="monotone" dataKey="adSpend" stroke="#f59e0b" strokeWidth={2} name="广告费" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-semibold">单品广告表现</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[11px]">SKU (名称)</TableHead>
                  <TableHead className="text-[11px]">曝光/点击</TableHead>
                  <TableHead className="text-[11px]">CPC</TableHead>
                  <TableHead className="text-[11px]">ACOS</TableHead>
                  <TableHead className="text-[11px]">ROAS</TableHead>
                  <TableHead className="text-[11px]">广告订单</TableHead>
                  <TableHead className="text-[11px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skuData.map((sku) => {
                  return (
                    <TableRow key={sku.sku}>
                      <TableCell>
                        <div className="font-mono text-xs">{sku.sku}</div>
                        <div className="text-[10px] text-text-sub truncate max-w-[80px]">{sku.skuName}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{sku.impressions.toLocaleString()}</div>
                        <div className="text-text-sub">{sku.clicks.toLocaleString()} ({((sku.clicks / sku.impressions) * 100).toFixed(1)}%)</div>
                      </TableCell>
                      <TableCell className="text-xs">${sku.cpc}</TableCell>
                      <TableCell className={`text-xs ${sku.acos > 25 ? 'text-danger' : 'text-success'}`}>
                        {sku.acos}%
                      </TableCell>
                      <TableCell className="text-xs">{sku.roas}</TableCell>
                      <TableCell className="text-xs">{sku.adOrders}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-[10px]">调整竞价</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
