export interface DailyStats {
  date: string;
  totalSales: number;
  totalOrders: number;
  adSpend: number;
  exchangeRate: number;
  questions: number;
  claims: number;
  reputation: '绿色店铺' | '领导者店铺' | '白银店铺' | '黄金店铺' | '铂金店铺' | 'green' | 'yellow' | 'red' | 'Verde (极佳)';
  calculatedProfit?: number;
}

export interface Claim {
  id: string;
  orderId: string;
  request: string;
  productName: string;
  handlingMethod: string;
  handlingTime: string;
  createdAt: string;
  status?: string;
}

export interface OperationLog {
  id: string;
  sku: string;
  date: string;
  action?: string;
  actionType: 'Price' | 'Image' | 'Ads' | 'Title' | 'Stock' | 'Other';
  description: string;
  createdAt: string;
}

export interface Competitor {
  id: string;
  url: string;
  name: string;
  specs?: string;
  imageUrl?: string;
  currentPrice: number;
  reviewCount: number;
  rating: number;
  lastUpdated: string;
}

export interface SKUStats {
  id?: string;
  sku: string;
  skuName: string;
  listedAt?: string;
  imageUrl?: string;
  date: string;
  sales: number;
  orders: number;
  stock: number;
  avgSalesSinceListing: number;
  slowStock: number;
  adSpend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  roas: number;
  acos: number;
  adOrders: number;
  purchasePrice: number;
  sellingPrice: number;
  specs?: string;
  reviewCount?: number;
  rating?: number;
  unitProfitExclAds: number;
  inTransitStock: number;
  inProductionStock: number;
  leadTimeDays: number;
  status?: string;
  competitors?: Competitor[];
  costConfig?: SkuPricingConfig;
  fakeOrderCost?: number;
  damageCost?: number;
  visits?: number;
}

export interface SkuPricingConfig {
  purchase_price_cny: number;
  selling_price_mxn: number;
  exchange_rate: number;
  commission_rate: number;
  ad_rate: number;
  return_rate: number;
  tax_rate: number;
  box_length: number;
  box_width: number;
  box_height: number;
  box_weight: number;
  pack_count: number;
  unit_length: number;
  unit_width: number;
  unit_height: number;
  product_weight: number;
  logistics_mode: string;
  sea_freight_unit_price: number;
  air_freight_unit_price: number;
  fixed_fee: number;
  last_mile_fee: number;
  margin: number;
}

export interface CalculatedMetrics {
  aov: number;
  acos: number;
  tacos: number;
  roas: number;
  doh: number;
  profit: number;
  profitMargin: number;
}

export interface FakeOrder {
  id: string;
  date: string;
  sku: string;
  skuName: string;
  reviewFeeCNY: number;
  refundAmountUSD: number;
  createdAt?: string;
}

export interface CargoDamage {
  id: string;
  sku: string;
  skuName: string;
  date: string;
  quantity: number;
  reason: '送仓差异' | '货代丢失' | '退货无法二次利用';
  skuValueCNY: number;
  createdAt?: string;
}

export interface SkuAdStats {
  id?: string;
  date: string;
  sku: string;
  targetRoas: number;
  budgetUsd: number;
  impressions: number;
  clicks: number;
  adOrders: number;
  adSpend: number;
  cpc?: number;
  roas?: number;
  acos?: number;
  createdAt?: string;
}

export interface SoftwareSuggestion {
  id: string;
  user_name: string;
  category: 'Feature Request' | 'Bug Report' | 'UI/UX' | 'Other';
  content: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'pending' | 'reviewed' | 'implemented' | 'rejected';
  created_at: string;
}

export interface SkuMetadata {
  sku: string;
  name?: string;
  purchasePrice?: number;
  listedAt?: string;
  status?: string;
  imageUrl?: string;
}

export interface ManagedSku {
  sku: string;
  name: string;
  imageUrl?: string;
  priceMXN: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

export type Currency = 'USD' | 'MXN' | 'CNY';

export type ReputationType = DailyStats['reputation'];

export type ActionType = OperationLog['actionType'];

export type CargoDamageReason = CargoDamage['reason'];

export interface ReportConfig {
  type: 'sales' | 'inventory' | 'profit' | 'ads' | 'comprehensive';
  dateRange: { start: string; end: string };
  skus?: string[];
  groupBy: 'day' | 'week' | 'month';
  format: 'pdf' | 'excel' | 'csv';
}

export interface ConversionFunnelData {
  stage: string;
  count: number;
  rate: number;
  color: string;
}

export interface HeatmapData {
  hour: number;
  day: string;
  value: number;
}
