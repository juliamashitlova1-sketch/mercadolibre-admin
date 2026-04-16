import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { OperationLog } from '../types';
import { useOutletContext } from 'react-router-dom';

interface ContextType {
  operationLogs: OperationLog[];
  onAddLog: () => void;
}

export default function Operations() {
  const { operationLogs, onAddLog } = useOutletContext<ContextType>();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-text-main">运营操作日志</h2>
          <p className="text-text-sub text-sm">记录 SKU 的调价、改图等关键操作，回溯运营效果</p>
        </div>
        <Button onClick={onAddLog} className="gap-2">
          <Plus className="w-4 h-4" /> 记录新操作
        </Button>
      </header>

      <Card className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">操作历史记录</CardTitle>
          <Badge variant="outline" className="text-[10px] font-normal">共 {operationLogs.length} 条记录</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-[11px] h-10">操作日期</TableHead>
                <TableHead className="text-[11px] h-10">SKU</TableHead>
                <TableHead className="text-[11px] h-10">类型</TableHead>
                <TableHead className="text-[11px] h-10">操作详情</TableHead>
                <TableHead className="text-[11px] h-10">记录时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operationLogs.length > 0 ? (
                operationLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-medium">{log.date}</TableCell>
                    <TableCell className="text-xs font-mono font-bold text-primary">{log.sku}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {log.actionType === 'Price' ? '调价' : 
                         log.actionType === 'Image' ? '改图' : 
                         log.actionType === 'Ads' ? '广告' : 
                         log.actionType === 'Title' ? '标题' : 
                         log.actionType === 'Stock' ? '库存' : '其他'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[400px] whitespace-pre-wrap">{log.description}</TableCell>
                    <TableCell className="text-xs text-text-sub">{format(parseISO(log.createdAt), 'MM/dd HH:mm')}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-text-sub text-xs">
                    暂无操作记录，点击上方按钮开始记录
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
