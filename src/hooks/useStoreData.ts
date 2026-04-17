import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DailyStats, SKUStats, Claim, OperationLog } from '../types';
import { parseISO } from 'date-fns';

export function useSkuData() {
  const [skuData, setSkuData] = useState<SKUStats[]>([]);
  const [allSkuData, setAllSkuData] = useState<SKUStats[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshSkuData = useCallback(async () => {
    const { data, error } = await supabase
      .from('sku_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(1000); // Increased limit to ensure more context is available for each SKU
      
    // Fetch full history of orders for ALL SKUs to calculate lifetime average
    const { data: allHistory } = await supabase
      .from('sku_stats')
      .select('sku, orders');

    // Fetch SKU images from the dedicated metadata table
    let skuImageMap: Record<string, string> = {};
    const { data: imagesData } = await supabase
      .from('sku_images')
      .select('sku, image_url');
    if (imagesData) {
      imagesData.forEach((row: any) => {
        if (row.image_url) skuImageMap[row.sku] = row.image_url;
      });
    }
      
    if (error) { 
      console.error('Error fetching SKU stats:', error); 
      return; 
    }

    let metaDict: Record<string, { listedAt?: string }> = {};
    try {
      metaDict = JSON.parse(localStorage.getItem('milyfly_sku_metadata') || '{}');
    } catch {}

    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      sku: row.sku,
      skuName: row.sku_name || '',
      listedAt: metaDict[row.sku]?.listedAt,
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
      imageUrl: skuImageMap[row.sku] || row.image_url || '',
    }));

    const sumOrders: Record<string, number> = {};
    (allHistory || []).forEach(item => {
      sumOrders[item.sku] = (sumOrders[item.sku] || 0) + (item.orders || 0);
    });

    const latestPerSku: Record<string, SKUStats> = {};
    let localMetaDict: Record<string, { listedAt?: string; name?: string; purchasePrice?: any }> = {};
    try { localMetaDict = JSON.parse(localStorage.getItem('milyfly_sku_metadata') || '{}'); } catch {}
    
    const skuMetadataMap: Record<string, { name?: string; purchasePrice?: number; listedAt?: string }> = {};

    // Initialize with local storage (High Priority)
    Object.keys(localMetaDict).forEach(sku => {
      skuMetadataMap[sku] = {
        name: localMetaDict[sku].name,
        purchasePrice: Number(localMetaDict[sku].purchasePrice) || 0,
        listedAt: localMetaDict[sku].listedAt
      };
    });

    // 1. Supplement with database history (Lower Priority - fill gaps)
    [...mapped].reverse().forEach(item => {
      if (!skuMetadataMap[item.sku]) skuMetadataMap[item.sku] = {};
      if (!skuMetadataMap[item.sku].name && item.skuName && item.skuName !== '未命名资产') {
        skuMetadataMap[item.sku].name = item.skuName;
      }
      if (!skuMetadataMap[item.sku].purchasePrice && item.purchasePrice > 0) {
        skuMetadataMap[item.sku].purchasePrice = item.purchasePrice;
      }
      if (!skuMetadataMap[item.sku].listedAt && item.listedAt) {
        skuMetadataMap[item.sku].listedAt = item.listedAt;
      }
    });

    // Sync back to local storage if gaps were filled
    let needsSync = false;
    Object.keys(skuMetadataMap).forEach(s => {
      if (!localMetaDict[s] || (!localMetaDict[s].name && skuMetadataMap[s].name)) {
        localMetaDict[s] = { ...localMetaDict[s], ...skuMetadataMap[s] };
        needsSync = true;
      }
    });
    if (needsSync) localStorage.setItem('milyfly_sku_metadata', JSON.stringify(localMetaDict));

    // 2. Identify the latest daily record for operational stats
    mapped.forEach(item => {
      if (!latestPerSku[item.sku] || parseISO(item.date) > parseISO(latestPerSku[item.sku].date)) {
        latestPerSku[item.sku] = { ...item };
      }
    });

    // 3. Merge metadata into the latest records
    Object.values(latestPerSku).forEach(sku => {
      const meta = skuMetadataMap[sku.sku];
      if (meta?.name) sku.skuName = meta.name;
      if (meta?.purchasePrice) sku.purchasePrice = meta.purchasePrice;
      if (meta?.listedAt) sku.listedAt = meta.listedAt;
      
      sku.leadTimeDays = 90;
      let days = 1;
      const finalListedAt = sku.listedAt || meta?.listedAt;
      if (finalListedAt && !isNaN(new Date(finalListedAt).getTime())) {
        const diffTime = Math.abs(new Date().getTime() - new Date(finalListedAt).getTime());
        days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
      sku.avgSalesSinceListing = Number((sumOrders[sku.sku] / days).toFixed(2));
    });

    setAllSkuData(mapped);
    setSkuData(Object.values(latestPerSku));
  }, []);

  useEffect(() => { 
    refreshSkuData(); 

    // Subscribe to sku_images changes for real-time image sync across devices
    const channel = supabase.channel('sku-images-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sku_images' }, () => refreshSkuData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refreshSkuData, refreshKey]);

  return { 
    skuData, 
    allSkuData,
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
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('operation_logs')
      .select('*')
      .order('date', { ascending: false })
      .limit(100);
      
    if (!error) {
      setOperationLogs((data || []).map((row: any) => {
        let skuVal = row.sku || ''; // Fallback for missing column
        let descriptionVal = row.details || '';
        let actionTypeVal: any = 'Price';

        // Try to parse details if it contains the full JSON data
        try {
          if (row.details && row.details.startsWith('{')) {
            const parsed = JSON.parse(row.details);
            if (!skuVal && parsed.sku) skuVal = parsed.sku;
            if (parsed.actionType) actionTypeVal = parsed.actionType;
            if (parsed.description) descriptionVal = parsed.description;
          }
        } catch (e) {
          console.error('Error parsing log details:', e);
        }

        return {
          id: row.id,
          date: row.date,
          sku: skuVal,
          action: row.action,
          createdAt: row.created_at,
          actionType: actionTypeVal,
          description: descriptionVal,
        };
      }));
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    
    const channel = supabase.channel('operation-logs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operation_logs' }, () => fetchLogs())
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [fetchLogs, refreshKey]);

  return { 
    operationLogs,
    refreshLogs: () => setRefreshKey(k => k + 1)
  };
}
