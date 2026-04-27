export interface DailyStats {
  date: string;
  totalSales: number;
  totalOrders: number;
  adSpend: number;
  exchangeRate: number;
  questions: number;
  claims: number;
  reputation: '绿色店铺' | '领导者店铺' | '白银店铺' | '黄金店铺' | '铂金店铺' | 'green' | 'yellow' | 'red' | 'Verde (极佳)';
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
  action?: string;
  actionType: 'Price' | 'Image' | 'Ads' | 'Title' | 'Stock' | 'Other';
  description: string;
  createdAt: string;
}

export interface Competitor {
  id: string;
  url: string;
  name: string; // 拟用作店铺等级
  specs?: string; // 竞品规格
  imageUrl?: string; // 竞品图片URL
  currentPrice: number;
  reviewCount: number;
  rating: number;
  lastUpdated: string;
}

export interface SKUStats {
  sku: string;
  skuName: string; // SKU 中文名称
  listedAt?: string; // 产品上架时间
  imageUrl?: string; // 产品主图 (Base64/URL)
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
  specs?: string; // 产品规格
  reviewCount?: number; // 评论数量
  rating?: number; // 评分
  unitProfitExclAds: number; // 当时利润-不含广告 (MXN)
  inTransitStock: number; // 在途库存
  inProductionStock: number; // 生产中库存
  leadTimeDays: number; // 头程时效 (天)
  status?: string; // 销售状态 (在售, 在途, ...)
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
  // Optional calculated fields if stored
  cpc?: number;
  roas?: number;
  acos?: number;
  createdAt?: string;
}
