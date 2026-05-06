import { create } from 'zustand';
import { SKUStats, DailyStats, Claim, OperationLog, FakeOrder, CargoDamage, ManagedSku } from '../types';
import { skuService } from '../services/skuService';
import { dataService, mapOperationLog } from '../services/dataService';
import { supabase } from '../lib/supabase';
import { parseISO } from 'date-fns';

interface AppState {
  skuData: SKUStats[];
  allSkuData: SKUStats[];
  managedSkus: ManagedSku[];
  dailyData: DailyStats[];
  claims: Claim[];
  operationLogs: OperationLog[];
  fakeOrders: FakeOrder[];
  cargoDamage: CargoDamage[];
  loading: boolean;
  uiVersion: string;

  fetchSkuData: () => Promise<void>;
  fetchDailyData: () => Promise<void>;
  fetchClaims: () => Promise<void>;
  fetchOperationLogs: () => Promise<void>;
  fetchExpenses: () => Promise<void>;
  fetchAll: () => Promise<void>;

  deleteClaim: (id: string) => Promise<void>;
  updateReputation: (newReputation: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  skuData: [],
  allSkuData: [],
  managedSkus: [],
  dailyData: [],
  claims: [],
  operationLogs: [],
  fakeOrders: [],
  cargoDamage: [],
  loading: false,
  uiVersion: 'v2',

  fetchSkuData: async () => {
    try {
      const [statsRows, allHistory, metaData, legacyImages, managedSkusData] = await Promise.all([
        skuService.fetchSkuStats(),
        skuService.fetchAllHistory(),
        skuService.fetchSkuMetadata(),
        skuService.fetchLegacyImages(),
        skuService.fetchManagedSkus(),
      ]);

      const skuMetadataMap: Record<string, { name?: string; purchasePrice?: number; listedAt?: string; status?: string; imageUrl?: string }> = {};

      metaData.forEach(row => {
        skuMetadataMap[row.sku] = {
          name: row.name,
          purchasePrice: Number(row.purchase_price) || 0,
          listedAt: row.listed_at,
          status: row.status,
          imageUrl: row.image_url,
        };
      });

      legacyImages.forEach(row => {
        if (!skuMetadataMap[row.sku]) skuMetadataMap[row.sku] = {};
        if (!skuMetadataMap[row.sku].imageUrl) {
          skuMetadataMap[row.sku].imageUrl = row.image_url;
        }
      });

      let localMetaDict: Record<string, { listedAt?: string; name?: string; purchasePrice?: any; image?: string }> = {};
      let localStatusDict: Record<string, string> = {};
      try {
        localMetaDict = JSON.parse(localStorage.getItem('milyfly_sku_metadata') || '{}');
        localStatusDict = JSON.parse(localStorage.getItem('milyfly_sku_statuses') || '{}');
      } catch {}

      Object.keys(localMetaDict).forEach(sku => {
        const local = localMetaDict[sku];
        const remote = skuMetadataMap[sku];

        if (local && (!remote || !remote.name || !remote.listedAt || !remote.status)) {
          const payload = {
            sku,
            name: remote?.name || local.name || '',
            purchase_price: remote?.purchasePrice || Number(local.purchasePrice) || 0,
            listed_at: remote?.listedAt || local.listedAt || null,
            status: remote?.status || localStatusDict[sku] || '在售',
            image_url: remote?.imageUrl || local.image || '',
            updated_at: new Date().toISOString(),
          };

          skuMetadataMap[sku] = {
            name: payload.name,
            purchasePrice: payload.purchase_price,
            listedAt: payload.listed_at || undefined,
            status: payload.status,
            imageUrl: payload.image_url,
          };

          supabase.from('sku_metadata').upsert({ ...payload, sku } as any, { onConflict: 'sku' }).then(({ error: sErr }) => {
            if (sErr) console.error('Auto-sync failed for', sku, sErr);
          });
        }
      });

      const mapped = statsRows.map(row => {
        const meta = skuMetadataMap[row.sku];
        return skuService.mapSkuStatsRow(row, meta);
      });

      const sumOrders: Record<string, number> = {};
      allHistory.forEach(item => {
        sumOrders[item.sku] = (sumOrders[item.sku] || 0) + (item.orders || 0);
      });

      const latestPerSku: Record<string, SKUStats> = {};
      mapped.forEach(item => {
        if (!latestPerSku[item.sku] || parseISO(item.date) > parseISO(latestPerSku[item.sku].date)) {
          latestPerSku[item.sku] = { ...item };
        }
      });

      Object.values(latestPerSku).forEach(sku => {
        sku.leadTimeDays = 90;
        sku.avgSalesSinceListing = skuService.calculateAvgSalesSinceListing(sku.sku, sumOrders, sku.listedAt);
      });

      const freshStatusDict: Record<string, string> = {};
      Object.values(latestPerSku).forEach(s => {
        if (s.status) freshStatusDict[s.sku] = s.status;
      });
      localStorage.setItem('milyfly_sku_statuses', JSON.stringify(freshStatusDict));

      set({
        allSkuData: mapped,
        skuData: Object.values(latestPerSku),
        managedSkus: managedSkusData,
      });
    } catch (error) {
      console.error('Error fetching SKU data:', error);
    }
  },

  fetchDailyData: async () => {
    try {
      const dailyData = await dataService.fetchDailyStats();
      set({ dailyData });
    } catch (error) {
      console.error('Error fetching daily data:', error);
    }
  },

  fetchClaims: async () => {
    try {
      const claims = await dataService.fetchClaims();
      set({ claims });
    } catch (error) {
      console.error('Error fetching claims:', error);
    }
  },

  fetchOperationLogs: async () => {
    try {
      const operationLogs = await dataService.fetchOperationLogs();
      set({ operationLogs });
    } catch (error) {
      console.error('Error fetching operation logs:', error);
    }
  },

  fetchExpenses: async () => {
    try {
      const [fakeOrders, cargoDamage] = await Promise.all([
        dataService.fetchFakeOrders(),
        dataService.fetchCargoDamage(),
      ]);
      set({ fakeOrders, cargoDamage });
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  },

  fetchAll: async () => {
    set({ loading: true });
    await Promise.all([
      get().fetchSkuData(),
      get().fetchDailyData(),
      get().fetchClaims(),
      get().fetchOperationLogs(),
      get().fetchExpenses(),
    ]);
    set({ loading: false });
  },

  deleteClaim: async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      await dataService.deleteClaim(id);
      set(state => ({ claims: state.claims.filter(c => c.id !== id) }));
      alert('已删除');
    } catch (error) {
      console.error('Delete error:', error);
      alert('删除失败');
    }
  },

  updateReputation: async (newReputation: string) => {
    try {
      await dataService.updateReputation(newReputation);
      alert('店铺状态已更新');
    } catch (error) {
      console.error('Error updating reputation:', error);
      alert('更新店铺状态失败');
    }
  },
}));
