import { SKUStats, OperationLog } from '../types';
import { MXN_TO_CNY } from '../constants';

const DEEPSEEK_API_KEY = 'sk-d983ac7159b94acbb66d8cc118048f16';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export interface AIAdvice {
  summary: string;
  pricingAdvice: string;
  advertisingAdvice: string;
  inventoryAdvice: string;
  listingAdvice: string;
  riskAlerts: string[];
  actionItems: string[];
  rawResponse: string;
}

function buildSystemPrompt(context: 'single' | 'multi' | 'predictive' | 'competitive'): string {
  const base = `你是一位顶级的跨境电商（美客多/MercadoLibre）高级数据分析师和运营策略专家。

**【强制货币单位执行准则 - 严禁混淆】：**
1. **MXN (墨西哥比索)**: 仅用于【销售额】、【售价】、【单日广告费】。
2. **CNY (人民币)**: 仅用于【采购价格】、【刷单成本】、【货损支出】。
3. **PCS (件数)**: 用于所有【销量】、【库存】。
* 汇率背景：1 MXN 约等于 0.38-0.42 CNY。
* 警告：严禁将广告费(MXN)与刷单费(CNY)直接相加，必须汇率换算。

**分析核心原则：**
1. **时间相关性分析**：关注操作日志日期，观察操作后1-3天的数据波动。
2. **多维指标穿透**：分析ACOS健康度、毛利率变动、库存周转风险。
3. **因果推断**：判断销量变化是因价格调整、广告增加还是自然波动。`;

  const prompts: Record<typeof context, string> = {
    single: `${base}

请按以下格式输出深度分析报告：
## 1. 核心经营业绩诊断
(总结销售环比、利润表现、广告ROAS)

## 2. 操作动作与数据波动复盘
(分析操作日志中的动作是否达到预期效果)

## 3. 流量与转化漏斗分析
(曝光→点击→订单的转化链路分析)

## 4. 首席分析师的战略建议
(给出具体的、可落地的优化动作清单：
- 定价策略建议
- 广告出价模式优化
- 库存预警与补货建议
- Listing优化方向)`,
    
    multi: `${base}

请按以下格式输出店铺全局分析报告：
## 1. 店铺整体经营概览
(总销售额、总利润、SKU贡献度排名)

## 2. SKU矩阵分析
(明星SKU、问题SKU、潜力SKU分类)

## 3. 广告效率矩阵
(各SKU的ACOS/ROAS对比，找出高效率和低效率SKU)

## 4. 库存风险评估
(缺货风险、滞销风险、补货紧迫度)

## 5. 战略行动计划
(按优先级排序的优化动作清单)`,
    
    predictive: `${base}

你同时是一位预测分析专家。请基于历史数据趋势进行预测：
## 1. 销量趋势预测
(基于近期数据走势预测未来7天/30天销量)

## 2. 库存预警
(计算各SKU的补货时间点和建议补货量)

## 3. 价格弹性分析
(分析价格变动对销量的影响)

## 4. 广告ROI预测
(基于当前广告效率预测预算调整效果)`,
    
    competitive: `${base}

你同时是一位竞争情报分析专家。请从竞争角度分析：
## 1. 竞争力评估
(基于价格、评分、评论数分析竞争力)

## 2. 定价策略建议
(结合竞品价格给出定价建议)

## 3. 差异化方向
(基于竞品分析找出差异化机会)

## 4. 防御策略
(如何保持竞争优势，防止被超越)`
  };

  return prompts[context];
}

function buildDataSummary(
  skuStats: SKUStats[],
  logs: OperationLog[],
  selectedSku: string
): string {
  if (selectedSku !== 'all') {
    const dailySequence = skuStats
      .filter(s => s.sku === selectedSku)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(s => {
        const convRate = s.clicks > 0 ? ((s.orders / s.clicks) * 100).toFixed(2) : '0';
        return `[${s.date}] 销量:${s.orders}PCS, 销售额:${s.sales.toFixed(2)}MXN, 广告费:${s.adSpend.toFixed(2)}MXN, 曝光:${s.impressions||0}, 点击:${s.clicks||0}, 转化率:${convRate}%, 库存:${s.stock}PCS`;
      })
      .join('\n');

    const sku = skuStats.find(s => s.sku === selectedSku);
    const stockDays = sku && sku.avgSalesSinceListing > 0 
      ? Math.floor(sku.stock / sku.avgSalesSinceListing) 
      : 999;

    return `### 目标SKU: ${selectedSku} (${sku?.skuName || '未知'}) 
【库存可售天数】: ${stockDays}天
【日均销量】: ${sku?.avgSalesSinceListing || 0} PCS
【头程时效】: ${sku?.leadTimeDays || 90} 天

每日流水：
${dailySequence}`;
  }

  const skuSummary = skuStats.reduce((acc, curr) => {
    if (!acc[curr.sku]) {
      acc[curr.sku] = {
        name: curr.skuName,
        totalSales: 0, totalOrders: 0, totalAdSpend: 0,
        totalProfit: 0, avgAcos: 0, days: 0, latestStock: 0
      };
    }
    acc[curr.sku].totalSales += curr.sales;
    acc[curr.sku].totalOrders += curr.orders;
    acc[curr.sku].totalAdSpend += curr.adSpend;
    acc[curr.sku].totalProfit += (curr.unitProfitExclAds * curr.orders) - (curr.adSpend * MXN_TO_CNY);
    acc[curr.sku].days += 1;
    acc[curr.sku].latestStock = curr.stock;
    acc[curr.sku].avgAcos = acc[curr.sku].totalAdSpend / (acc[curr.sku].totalSales || 1);
    return acc;
  }, {} as Record<string, any>);

  return `### 多SKU汇总数据：\n${JSON.stringify(skuSummary, null, 2)}`;
}

export async function analyzeStoreData(
  startDate: string,
  endDate: string,
  skuStats: SKUStats[],
  logs: OperationLog[],
  selectedSku: string = 'all',
  extraPrompt: string = ''
): Promise<string> {
  const dataContext = buildDataSummary(skuStats, logs, selectedSku);

  const logsSummary = logs
    .filter(l => selectedSku === 'all' || l.sku === selectedSku)
    .map(l => `[${l.date}] ${l.sku}: ${l.actionType} - ${l.description}`)
    .join('\n');

  const systemPrompt = buildSystemPrompt('single');

  const fullSystemPrompt = `${systemPrompt}

数据范围：${startDate} 到 ${endDate}
分析对象：${selectedSku === 'all' ? '店铺整体表现' : `特定SKU: ${selectedSku}`}

${extraPrompt ? `**【用户特别指令 / 重点聚焦】**：\n${extraPrompt}\n请特别针对上述指令提供深度解答。` : ''}`;

  const userPrompt = `以下是分析所需的上下文原始数据：

${dataContext}

【操作日志记录】：
${logsSummary || '此时间段内无相关操作记录'}`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: fullSystemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'AI请求失败');
    }

    const result = await response.json();
    return result.choices[0].message.content;
  } catch (error: unknown) {
    console.error('DeepSeek Analysis Error:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function getPredictiveAnalysis(
  skuStats: SKUStats[],
  selectedSku: string
): Promise<string> {
  return analyzeStoreData(
    new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    new Date().toISOString().split('T')[0],
    skuStats,
    [],
    selectedSku,
    '请重点进行销量预测和库存预警分析，计算补货时间点。'
  );
}

export async function getCompetitiveAnalysis(
  skuStats: SKUStats[],
  selectedSku: string
): Promise<string> {
  return analyzeStoreData(
    new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    new Date().toISOString().split('T')[0],
    skuStats,
    [],
    selectedSku,
    '请重点分析竞争力和定价策略，给出差异化建议。'
  );
}
