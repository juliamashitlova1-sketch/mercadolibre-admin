export interface DailyStats {
  date: string;
  totalSales: number;
  totalOrders: number;
  adSpend: number;
  exchangeRate: number;
  questions: number;
  claims: number;
  reputation: 'green' | 'yellow' | 'red';
  calculatedProfit?: number; // 汇总后的真实净利润
}

export interface Claim {
  id: string;
  orderId: string;
  request: string;
  productName: string;
  handlingMethod: string;
  handlingTime: string;
  createdAt: string;
}

export interface OperationLog {
  id: string;
  sku: string;
  date: string;
  actionType: 'Price' | 'Image' | 'Ads' | 'Title' | 'Stock' | 'Other';
  description: string;
  createdAt: string;
}

export interface Competitor {
  id: string;
  url: string;
  name: string;
  currentPrice: number;
  reviewCount: number;
  rating: number;
  lastUpdated: string;
}

export interface SKUStats {
  sku: string;
  skuName: string; // SKU 中文名称
  date: string;
  sales: number;
  orders: number;
  stock: number;
  avgSalesSinceListing: number; // 上架至今的平均销量
  slowStock: number;
  adSpend: number; // 当日广告消耗
  impressions: number; // 当日曝光
  clicks: number; // 当日点击数
  cpc: number; // 当日CPC
  roas: number; // 当日roas
  acos: number; // 当日acos
  adOrders: number; // 当日广告订单数
  purchasePrice: number; // 采购价 (CNY)
  sellingPrice: number; // 当时售价 (MXN)
  unitProfitExclAds: number; // 当时利润-不含广告 (MXN)
  inTransitStock: number; // 在途库存
  inProductionStock: number; // 生产中库存
  leadTimeDays: number; // 头程时效 (天)
  competitors?: Competitor[]; // 竞品列表
}

export interface CalculatedMetrics {
  aov: number;
  acos: number;
  tacos: number; // 总广告费 / 总销售额
  roas: number;
  doh: number;
  profit: number;
  profitMargin: number;
}
