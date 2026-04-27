import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DailyStats, SKUStats, Claim, OperationLog, FakeOrder, CargoDamage } from '../types';
import { parseISO } from 'date-fns';

export function useSkuData() {
  const [skuData, setSkuData] = useState<SKUStats[]>([]);
  const [allSkuData, setAllSkuData] = useState<SKUStats[]>([]);
  const [managedSkus, setManagedSkus] = useState<any[]>([]);
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

    // 1. Fetch Shared SKU Metadata (the new Single Source of Truth)
    let skuMetadataMap: Record<string, { name?: string; purchasePrice?: number; listedAt?: string; status?: string; imageUrl?: string }> = {};
    const { data: metaData, error: metaError } = await supabase
      .from('sku_metadata')
      .select('*');
    
    if (metaData) {
      metaData.forEach((row: any) => {
        skuMetadataMap[row.sku] = {
          name: row.name,
          purchasePrice: Number(row.purchase_price) || 0,
          listedAt: row.listed_at,
          status: row.status,
          imageUrl: row.image_url
        };
      });
    }

    // Fallback: Fetch legacy images if sku_metadata is incomplete
    const { data: legacyImages } = await supabase.from('sku_images').select('sku, image_url');
    if (legacyImages) {
      legacyImages.forEach((row: any) => {
        if (!skuMetadataMap[row.sku]) skuMetadataMap[row.sku] = {};
        if (!skuMetadataMap[row.sku].imageUrl) {
          skuMetadataMap[row.sku].imageUrl = row.image_url;
        }
      });
    }
      
    if (error) { 
      console.error('Error fetching SKU stats:', error); 
      return; 
    }

    if (metaError) {
      // Non-fatal: Might happen if the user hasn't run the migration yet
      console.warn('SKU Metadata table not found or accessible, falling back to local storage and stats:', metaError);
    }

    // 2. Legacy Migration & Self-Rescue (localStorage -> DB)
    let localMetaDict: Record<string, { listedAt?: string; name?: string; purchasePrice?: any; image?: string }> = {};
    let localStatusDict: Record<string, string> = {};
    try { 
      localMetaDict = JSON.parse(localStorage.getItem('milyfly_sku_metadata') || '{}'); 
      localStatusDict = JSON.parse(localStorage.getItem('milyfly_sku_statuses') || '{}');
    } catch {}

    Object.keys(localMetaDict).forEach(sku => {
      const local = localMetaDict[sku];
      const remote = skuMetadataMap[sku];
      
      // If DB is missing info that I have locally, sync it UP
      if (local && (!remote || !remote.name || !remote.listedAt || !remote.status)) {
        const payload = {
          sku: sku,
          name: remote?.name || local.name || '',
          purchase_price: remote?.purchasePrice || Number(local.purchasePrice) || 0,
          listed_at: remote?.listedAt || local.listedAt || null,
          status: remote?.status || localStatusDict[sku] || '在售',
          image_url: remote?.imageUrl || local.image || '',
          updated_at: new Date().toISOString()
        };
        
        // Optimistically update map
        skuMetadataMap[sku] = {
          name: payload.name,
          purchasePrice: payload.purchase_price,
          listedAt: payload.listed_at || undefined,
          status: payload.status,
          imageUrl: payload.image_url
        };

        // Async sync to DB
        supabase.from('sku_metadata').upsert(payload, { onConflict: 'sku' }).then(({ error: sErr }) => {
          if (sErr) console.error('Auto-sync failed for', sku, sErr);
        });
      }
    });

    // 2.5 Fetch Managed SKUs (Source of Truth for SKU selection)
    const { data: managedSkusData } = await supabase
      .from('skus')
      .select('*')
      .order('sku', { ascending: true });
    
    if (managedSkusData) {
      setManagedSkus(managedSkusData.map(s => ({
        sku: s.sku,
        name: s.product_name || s.name,
        imageUrl: s.image_url
      })));
    }

    // 3. Map Daily Records
    const mapped = (data || []).map((row: any) => {
      const meta = skuMetadataMap[row.sku];
      return {
        id: row.id,
        sku: row.sku,
        skuName: meta?.name || row.sku_name || '',
        listedAt: meta?.listedAt || row.listed_at, // Use meta with fallback
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
        purchasePrice: meta?.purchasePrice || row.purchase_price || 0,
        sellingPrice: row.selling_price || 0,
        unitProfitExclAds: row.unit_profit_excl_ads || 0,
        inTransitStock: row.in_transit_stock || 0,
        inProductionStock: row.in_production_stock || 0,
        leadTimeDays: row.lead_time_days || 90,
        competitors: row.competitors || [],
        imageUrl: meta?.imageUrl || row.image_url || '',
        status: meta?.status || '在售'
      };
    });

    const sumOrders: Record<string, number> = {};
    (allHistory || []).forEach(item => {
      sumOrders[item.sku] = (sumOrders[item.sku] || 0) + (item.orders || 0);
    });

    // 4. Identify the latest daily record for operational stats
    const latestPerSku: Record<string, SKUStats> = {};
    mapped.forEach(item => {
      if (!latestPerSku[item.sku] || parseISO(item.date) > parseISO(latestPerSku[item.sku].date)) {
        latestPerSku[item.sku] = { ...item };
      }
    });

    // 5. Final Calculation (Agreement between all machines)
    Object.values(latestPerSku).forEach(sku => {
      sku.leadTimeDays = 90;
      let days = 1;
      if (sku.listedAt && !isNaN(new Date(sku.listedAt).getTime())) {
        const diffTime = Math.abs(new Date().getTime() - new Date(sku.listedAt).getTime());
        days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
      sku.avgSalesSinceListing = Number((sumOrders[sku.sku] / days).toFixed(2));
    });

    // 6. Push statuses back to localStorage only as a secondary cache for UI responsiveness
    const freshStatusDict: Record<string, string> = {};
    Object.values(latestPerSku).forEach(s => {
       if (s.status) freshStatusDict[s.sku] = s.status;
    });
    localStorage.setItem('milyfly_sku_statuses', JSON.stringify(freshStatusDict));

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
    managedSkus,
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
        reputation: row.reputation || '绿色店铺',
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
          productName: row.product_name || '',
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
export function useExpenses() {
  const [fakeOrders, setFakeOrders] = useState<FakeOrder[]>([]);
  const [cargoDamage, setCargoDamage] = useState<CargoDamage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: fData } = await supabase
      .from('fake_orders')
      .select('*, reviewFeeCNY:review_fee_cny, refundAmountUSD:refund_amount_usd, skuName:sku_name')
      .order('date', { ascending: false });
    
    const { data: cData } = await supabase
      .from('cargo_damage')
      .select('*, skuName:sku_name, skuValueCNY:sku_value_cny')
      .order('date', { ascending: false });

    setFakeOrders(fData || []);
    setCargoDamage(cData || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    
    const fChannel = supabase.channel('fake-orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fake_orders' }, () => fetchData())
      .subscribe();
      
    const cChannel = supabase.channel('cargo-damage-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cargo_damage' }, () => fetchData())
      .subscribe();
      
    return () => {
      supabase.removeChannel(fChannel);
      supabase.removeChannel(cChannel);
    };
  }, [fetchData, refreshKey]);

  return { 
    fakeOrders, 
    cargoDamage, 
    loading, 
    refreshExpenses: () => setRefreshKey(k => k + 1) 
  };
}
