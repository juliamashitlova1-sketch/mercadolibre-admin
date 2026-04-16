import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { SKUStats } from '../types';
import { useOutletContext } from 'react-router-dom';

interface ContextType {
  skuData: SKUStats[];
  onEditSku: (sku: SKUStats) => void;
}

export default function Competitors() {
  const { skuData, onEditSku } = useOutletContext<ContextType>();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-text-main">竞品监控中心</h2>
          <p className="text-text-sub text-sm">追踪每个 SKU 对应的核心竞品价格、评价与排名动态</p>
        </div>
        <div className="text-xs text-text-sub bg-slate-100 px-3 py-1 rounded-full">
          提示: 点击 SKU 可快速更新竞品数据
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {skuData.map((sku) => (
          <Card key={sku.sku} className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 py-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary font-mono text-xs px-2 py-1 rounded">
                  {sku.sku}
                </div>
                <CardTitle className="text-sm font-bold">{sku.skuName}</CardTitle>
                <div className="text-xs text-text-sub">
                  我的售价: <span className="font-bold text-text-main">${sku.sellingPrice}</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px]"
                onClick={() => onEditSku(sku)}
              >
                更新竞品数据
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-[11px] h-8">竞品名称/链接</TableHead>
                    <TableHead className="text-[11px] h-8">当前售价</TableHead>
                    <TableHead className="text-[11px] h-8">价格差</TableHead>
                    <TableHead className="text-[11px] h-8">评价数量</TableHead>
                    <TableHead className="text-[11px] h-8">评分</TableHead>
                    <TableHead className="text-[11px] h-8 text-right">最后更新</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sku.competitors && sku.competitors.length > 0 ? (
                    sku.competitors.map((comp) => {
                      const priceDiff = sku.sellingPrice - comp.currentPrice;
                      return (
                        <TableRow key={comp.id} className="h-10">
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{comp.name || '未命名竞品'}</span>
                              {comp.url && (
                                <a href={comp.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-bold">${comp.currentPrice}</TableCell>
                          <TableCell className="text-xs">
                            <span className={priceDiff > 0 ? 'text-danger' : 'text-success'}>
                              {priceDiff > 0 ? `比我便宜 $${priceDiff.toFixed(1)}` : `比我贵 $${Math.abs(priceDiff).toFixed(1)}`}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">{comp.reviewCount}</TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1">
                              <span className="font-bold">{comp.rating}</span>
                              <span className="text-amber-400">★</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-[10px] text-text-sub">
                            {comp.lastUpdated}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-xs text-text-sub italic">
                        暂无监控竞品，点击右上角“更新竞品数据”添加
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
