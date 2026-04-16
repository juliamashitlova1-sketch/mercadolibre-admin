import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DailyStats, SKUStats, Claim, OperationLog } from '../types';
import { parseISO } from 'date-fns';

export function useSkuData() {
  const [skuData, setSkuData] = useState<SKUStats[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshSkuData = useCallback(async () => {
    const { data, error } = await supabase
      .from('sku_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(200);
      
    if (error) { 
      console.error('Error fetching SKU stats:', error); 
      return; 
    }

    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      sku: row.sku,
      skuName: row.sku_name || '',
      date: row.date,
      sales: row.sales || 0,
      orders: row.orders || 0,
      stock: row.stock || 0,
      avgSalesSinceListing: row.avg_sales_since_listing || 0,
      slowStock: row.slow_stock || 0,
      adSpend: row.ad_spend || 0,
      impressions: row.impressions || 0,
      clicks: row.clicks || 0,
      cpc: row.cpc || 0,
      roas: row.roas || 0,
      acos: row.acos || 0,
      adOrders: row.ad_orders || 0,
      purchasePrice: row.purchase_price || 0,
      sellingPrice: row.selling_price || 0,
      unitProfitExclAds: row.unit_profit_excl_ads || 0,
      inTransitStock: row.in_transit_stock || 0,
      inProductionStock: row.in_production_stock || 0,
      leadTimeDays: row.lead_time_days || 7,
      competitors: row.competitors || [],
    }));

    const latestPerSku: Record<string, SKUStats> = {};
    mapped.forEach(item => {
      if (!latestPerSku[item.sku] || parseISO(item.date) > parseISO(latestPerSku[item.sku].date)) {
        latestPerSku[item.sku] = item;
      }
    });

    setSkuData(Object.values(latestPerSku));
  }, []);

  useEffect(() => { 
    refreshSkuData(); 
  }, [refreshSkuData, refreshKey]);

  return { 
    skuData, 
    refreshSkuData: () => setRefreshKey(k => k + 1) 
  };
}

export function useDailyStats() {
  const [dailyData, setDailyData] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDailyStats = async () => {
      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .order('date', { ascending: true })
        .limit(30);
        
      if (error) {
        console.error('Error fetching daily stats:', error);
        setLoading(false);
        return;
      }
      
      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        date: row.date,
        totalSales: row.total_sales || 0,
        totalOrders: row.total_orders || 0,
        adSpend: row.ad_spend || 0,
        exchangeRate: row.exchange_rate || 0.35,
        questions: row.questions || 0,
        claims: row.claims || 0,
        reputation: row.reputation || 'green',
        calculatedProfit: row.calculated_profit,
      }));
      setDailyData(mapped);
      setLoading(false);
    };

    fetchDailyStats();
    
    const channel = supabase.channel('daily-stats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_stats' }, () => fetchDailyStats())
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  return { dailyData, loading };
}

export function useClaims() {
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(() => {
    const fetchClaims = async () => {
      const { data, error } = await supabase
        .from('claims')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (!error) {
        setClaims((data || []).map((row: any) => ({
          id: row.id,
          orderId: row.order_number || '',
          request: row.reason?.split('|')[0] || '',
          productName: '',
          handlingMethod: row.reason?.split('|')[1]?.trim().split('@')[0] || '',
          handlingTime: row.reason?.split('@')[1]?.trim() || '',
          createdAt: row.created_at,
          status: row.status,
        })));
      }
    };

    fetchClaims();
    
    const channel = supabase.channel('claims-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, () => fetchClaims())
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  return { claims };
}

export function useOperationLogs() {
  const [operationLogs, setOperationLogs] = useState<OperationLog[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('operation_logs')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);
        
      if (!error) {
        setOperationLogs((data || []).map((row: any) => ({
          id: row.id,
          date: row.date,
          action: row.action,
          sku: row.sku,
          details: row.details,
          createdAt: row.created_at,
          actionType: row.action,
          description: row.details,
        })));
      }
    };

    fetchLogs();
    
    const channel = supabase.channel('operation-logs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operation_logs' }, () => fetchLogs())
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  return { operationLogs };
}
