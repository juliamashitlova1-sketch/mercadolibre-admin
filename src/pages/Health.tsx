import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle2, AlertTriangle, ShieldCheck, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { DailyStats, Claim } from '../types';
import { useOutletContext } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContextType {
  dailyData: DailyStats[];
  claims: Claim[];
  onAddClaim: () => void;
  onUpdateReputation: (status: string) => Promise<void>;
  onEditClaim: (claim: Claim) => void;
  onDeleteClaim: (id: string) => Promise<void>;
}

export default function Health() {
  const { dailyData, claims, onAddClaim, onUpdateReputation, onEditClaim, onDeleteClaim } = useOutletContext<ContextType>();
  const latestStats = (dailyData[dailyData.length - 1] || { claims: 0, reputation: '绿色店铺' }) as DailyStats;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-text-main">账号申诉/纠纷处理</h2>
          <p className="text-text-sub text-sm">监控店铺信誉、处理退款纠纷与申诉记录</p>
        </div>
        <Button onClick={onAddClaim} className="gap-2">
          <Plus className="w-4 h-4" /> 记录新纠纷
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border shadow-sm bg-card rounded-xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-success" />
            </div>
            <div>
              <div className="text-xs text-text-sub font-medium">店铺信誉状态</div>
              <div className="text-xl font-bold text-slate-800">{latestStats.reputation || '绿色店铺'}</div>
            </div>
          </div>
          <Select 
            defaultValue={latestStats.reputation} 
            onValueChange={(val) => onUpdateReputation(val)}
          >
            <SelectTrigger className="w-40 bg-white shadow-sm border-slate-200">
              <SelectValue placeholder="更新状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="绿色店铺">绿色店铺</SelectItem>
              <SelectItem value="领导者店铺">领导者店铺</SelectItem>
              <SelectItem value="白银店铺">白银店铺</SelectItem>
              <SelectItem value="黄金店铺">黄金店铺</SelectItem>
              <SelectItem value="铂金店铺">铂金店铺</SelectItem>
              <SelectItem value="Verde (极佳)">Verde (极佳)</SelectItem>
            </SelectContent>
          </Select>
        </Card>
        <Card className="border-border shadow-sm bg-card rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-danger" />
          </div>
          <div>
            <div className="text-xs text-text-sub font-medium">待处理纠纷 (Reclamos)</div>
            <div className="text-xl font-bold text-danger">{latestStats.claims}</div>
          </div>
        </Card>
      </div>

      <Card className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">近期纠纷处理记录</CardTitle>
          <Badge variant="outline" className="text-[10px] font-normal">共 {claims.length} 条记录</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-[11px] h-10">订单号</TableHead>
                <TableHead className="text-[11px] h-10">商品名称</TableHead>
                <TableHead className="text-[11px] h-10">诉求</TableHead>
                <TableHead className="text-[11px] h-10">处理方式</TableHead>
                <TableHead className="text-[11px] h-10">处理时间</TableHead>
                <TableHead className="text-[11px] h-10 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.length > 0 ? (
                claims.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell className="text-xs font-mono font-medium">{claim.orderId}</TableCell>
                    <TableCell className="text-xs">{claim.productName}</TableCell>
                    <TableCell className="text-xs text-danger">{claim.request}</TableCell>
                    <TableCell className="text-xs font-medium text-emerald-600">{claim.handlingMethod}</TableCell>
                    <TableCell className="text-xs text-text-sub">{claim.handlingTime}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                          onClick={() => onEditClaim(claim)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-slate-400 hover:text-danger"
                          onClick={() => onDeleteClaim(claim.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-text-sub text-xs">
                    暂无纠纷记录，点击上方按钮添加
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
