import { supabase } from '../lib/supabase';
import { parseISO } from 'date-fns';
import { SKUStats, SkuMetadata, ManagedSku } from '../types';

interface SkuMetadataRow {
  sku: string;
  name?: string;
  purchase_price?: number;
  listed_at?: string;
  status?: string;
  image_url?: string;
}

interface SkuStatsRow {
  id: string;
  sku: string;
  sku_name?: string;
  listed_at?: string;
  date: string;
  sales?: number;
  orders?: number;
  stock?: number;
  avg_sales_since_listing?: number;
  slow_stock?: number;
  ad_spend?: number;
  impressions?: number;
  clicks?: number;
  cpc?: number;
  roas?: number;
  acos?: number;
  ad_orders?: number;
  purchase_price?: number;
  selling_price?: number;
  unit_profit_excl_ads?: number;
  in_transit_stock?: number;
  in_production_stock?: number;
  lead_time_days?: number;
  competitors?: any[];
  image_url?: string;
  [key: string]: any;
}

interface SkusRow {
  sku: string;
  product_name?: string;
  name?: string;
  image_url?: string;
  price_mxn?: number;
  [key: string]: any;
}

export const skuService = {
  async fetchSkuStats(): Promise<SkuStatsRow[]> {
    const { data, error } = await supabase
      .from('sku_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return data || [];
  },

  async fetchAllHistory(): Promise<{ sku: string; orders: number }[]> {
    const { data } = await supabase
      .from('sku_stats')
      .select('sku, orders');
    return data || [];
  },

  async fetchSkuMetadata(): Promise<SkuMetadataRow[]> {
    const { data, error } = await supabase
      .from('sku_metadata')
      .select('*');
    if (error) {
      console.warn('SKU Metadata table not found:', error);
      return [];
    }
    return data || [];
  },

  async fetchLegacyImages(): Promise<{ sku: string; image_url: string }[]> {
    const { data } = await supabase
      .from('sku_images')
      .select('sku, image_url');
    return data || [];
  },

  async fetchManagedSkus(): Promise<ManagedSku[]> {
    const { data } = await supabase
      .from('skus')
      .select('*')
      .order('sku', { ascending: true });
    return (data || []).map((s: SkusRow) => ({
      sku: s.sku,
      name: s.product_name || s.name || '',
      imageUrl: s.image_url || '',
      priceMXN: Number(s.price_mxn) || 0,
    }));
  },

  mapSkuStatsRow(
    row: SkuStatsRow,
    meta?: { name?: string; purchasePrice?: number; listedAt?: string; status?: string; imageUrl?: string }
  ): SKUStats {
    return {
      id: row.id,
      sku: row.sku,
      skuName: meta?.name || row.sku_name || '',
      listedAt: meta?.listedAt || row.listed_at,
      imageUrl: meta?.imageUrl || row.image_url || '',
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
      status: meta?.status || '在售',
    };
  },

  calculateAvgSalesSinceListing(
    sku: string,
    sumOrders: Record<string, number>,
    listedAt?: string
  ): number {
    let days = 1;
    if (listedAt && !isNaN(new Date(listedAt).getTime())) {
      const diffTime = Math.abs(new Date().getTime() - new Date(listedAt).getTime());
      days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
    return Number(((sumOrders[sku] || 0) / days).toFixed(2));
  }
};
