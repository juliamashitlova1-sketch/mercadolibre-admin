import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CargoDamage } from '../types';
import { getMexicoDateString } from '../lib/time';

const REASONS = ['送仓差异', '货代丢失', '退货无法二次利用'] as const;

export default function CargoDamagePage() {
  const [data, setData] = useState<CargoDamage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Partial<CargoDamage>>({
    date: getMexicoDateString(),
    sku: '',
    skuName: '',
    quantity: 0,
    reason: '送仓差异',
    skuValueCNY: 0
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: records, error } = await supabase
      .from('cargo_damage')
      .select('*, skuName:sku_name, skuValueCNY:sku_value_cny')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching cargo damage:', error);
    } else {
      setData(records || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!currentRecord.sku || !currentRecord.date || !currentRecord.reason) {
      alert('请填写完整信息');
      return;
    }

    const payload = {
      date: currentRecord.date,
      sku: currentRecord.sku,
      sku_name: currentRecord.skuName,
      quantity: currentRecord.quantity,
      reason: currentRecord.reason,
      sku_value_cny: currentRecord.skuValueCNY
    };

    let error;
    if (currentRecord.id) {
      const { error: err } = await supabase
        .from('cargo_damage')
        .update(payload)
        .eq('id', currentRecord.id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from('cargo_damage')
        .insert([payload]);
      error = err;
    }

    if (error) {
      alert('保存失败: ' + error.message);
    } else {
      setIsEditing(false);
      setCurrentRecord({
        date: getMexicoDateString(),
        sku: '',
        skuName: '',
        quantity: 0,
        reason: '送仓差异',
        skuValueCNY: 0
      });
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    const { error } = await supabase.from('cargo_damage').delete().eq('id', id);
    if (error) {
      alert('删除失败');
    } else {
      fetchData();
    }
  };

  return (
    <div className="flex flex-col gap-6 p-2">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">货损支出管理</h2>
          <p className="text-slate-500 text-sm">记录供应链中的库存损耗与异常成本</p>
        </div>
        <Button onClick={() => {
          setCurrentRecord({
            date: getMexicoDateString(),
            sku: '',
            skuName: '',
            quantity: 0,
            reason: '送仓差异',
            skuValueCNY: 0
          });
          setIsEditing(true);
        }} className="gap-2 bg-rose-600 hover:bg-rose-700">
          <Plus className="w-4 h-4" /> 记录货损
        </Button>
      </header>

      {isEditing && (
        <Card className="border-rose-100 bg-rose-50/30">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{currentRecord.id ? '编辑记录' : '新增货损'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">货损日期</Label>
                <Input 
                  type="date" 
                  value={currentRecord.date} 
                  onChange={e => setCurrentRecord({...currentRecord, date: e.target.value})}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">SKU</Label>
                <Input 
                  placeholder="如: A09" 
                  value={currentRecord.sku} 
                  onChange={e => setCurrentRecord({...currentRecord, sku: e.target.value.toUpperCase()})}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">数量</Label>
                <Input 
                  type="number" 
                  value={currentRecord.quantity} 
                  onChange={e => setCurrentRecord({...currentRecord, quantity: Number(e.target.value)})}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">货损原因</Label>
                <Select 
                  value={currentRecord.reason} 
                  onValueChange={(val: any) => setCurrentRecord({...currentRecord, reason: val})}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="选择原因" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">单件货值 (CNY)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={currentRecord.skuValueCNY} 
                  onChange={e => setCurrentRecord({...currentRecord, skuValueCNY: Number(e.target.value)})}
                  className="bg-white"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1 bg-rose-600 hover:bg-rose-700">保存</Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>取消</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[120px]">日期</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>数量</TableHead>
                <TableHead>原因</TableHead>
                <TableHead>单件货值 (CNY)</TableHead>
                <TableHead className="text-rose-600 font-bold">损失总额 (CNY)</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" />
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400">暂无货损记录</TableCell>
                </TableRow>
              ) : data.map((record) => (
                <TableRow key={record.id} className="group">
                  <TableCell className="text-xs font-mono text-slate-500">{record.date}</TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-700">{record.sku}</div>
                    <div className="text-[10px] text-slate-400">{record.skuName}</div>
                  </TableCell>
                  <TableCell className="font-bold">{record.quantity}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 text-rose-500" />
                      <span className="text-xs text-slate-600">{record.reason}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">¥{Number(record.skuValueCNY || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-mono font-bold text-rose-600">
                    ¥{(Number(record.quantity || 0) * Number(record.skuValueCNY || 0)).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-sky-600"
                        onClick={() => {
                          setCurrentRecord(record);
                          setIsEditing(true);
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-rose-600"
                        onClick={() => handleDelete(record.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
