import { SKUStats, OperationLog } from '../types';
import { MXN_TO_CNY } from '../constants';

const DEEPSEEK_API_KEY = 'sk-d983ac7159b94acbb66d8cc118048f16';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export async function analyzeStoreData(
  startDate: string,
  endDate: string,
  skuStats: SKUStats[],
  logs: OperationLog[],
  selectedSku: string = 'all',
  extraPrompt: string = ''
) {

  // 1. Prepare data summary for AI context
  let dataContext = '';
  
  if (selectedSku !== 'all') {
    // Single SKU Deep Dive: Provide Daily Sequence for impact analysis
    const dailySequence = skuStats
      .filter(s => s.sku === selectedSku)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(s => `[${s.date}] 销量:${s.orders}, 销售额(MXN):${s.sales.toFixed(2)}, 广告费(MXN):${s.adSpend.toFixed(2)}, 曝光:${s.impressions || 0}, 点击:${s.clicks || 0}, 访客:${s.visits || 0}, 转化率:${((s.orders / (s.clicks || s.visits || 1)) * 100).toFixed(2)}%`)
      .join('\n');
    
    dataContext = `### 目标 SKU: ${selectedSku} (${skuStats.find(s => s.sku === selectedSku)?.skuName || '未知名称'}) 的每日流水：\n${dailySequence}`;
  } else {
    // Multi SKU Overview: Provide Summary
    const skuSummary = skuStats.reduce((acc, curr) => {
      if (!acc[curr.sku]) {
        acc[curr.sku] = {
          name: curr.skuName,
          totalSales: 0,
          totalOrders: 0,
          totalAdSpend: 0,
          totalProfit: 0,
          avgAcos: 0,
          days: 0
        };
      }
      acc[curr.sku].totalSales += curr.sales;
      acc[curr.sku].totalOrders += curr.orders;
      acc[curr.sku].totalAdSpend += curr.adSpend;
      acc[curr.sku].totalProfit += (curr.unitProfitExclAds * curr.orders) - (curr.adSpend * MXN_TO_CNY);
      acc[curr.sku].days += 1;
      acc[curr.sku].avgAcos = acc[curr.sku].totalAdSpend / (acc[curr.sku].totalSales || 1);
      return acc;
    }, {} as Record<string, any>);
    
    dataContext = `### 多个 SKU 汇总汇总数据：\n${JSON.stringify(skuSummary, null, 2)}`;
  }

  const logsSummary = logs
    .filter(l => selectedSku === 'all' || l.sku === selectedSku)
    .map(l => `[${l.date}] ${l.sku}: ${l.actionType} - ${l.description}`)
    .join('\n');

  const systemPrompt = `你是一位顶级的跨境电商（美客多/MercadoLibre）高级数据分析师和运营策略专家。
你的任务是根据提供的 SKU 销售流水和操作日志，进行复盘分析，并给出专业建议。

**分析核心原则：**
1. **时间相关性分析**：特别关注操作日志日期，观察在该操作发生后的 1-3 天内，点击量、转化率和销量是否有显著波动。
2. **多维指标穿透**：不要只看销售额。分析 ACOS 的健康度、毛利率的变动以及库存周转风险。
3. **因果推断**：如果销量上升，判断是因为降低了价格、增加了广告、还是自然波动的正常回归。

数据范围：${startDate} 到 ${endDate}
分析对象：${selectedSku === 'all' ? '店铺整体表现' : `特定 SKU: ${selectedSku}`}

请按以下格式输出深度分析报告（使用专业、严谨且具有前瞻性的语气）：
## 1. 核心经营业绩诊断
(总结这段时间的销售环比、利润表现、以及广告费用的投入产出比 ROAS)
## 2. 操作动作与数据波动复盘
(重点：分析操作日志中的动作（如调价、广告调整）是否达到了预期效果？是正向回馈还是负向影响？)
## 3. 细分 SKU 指标拆解
(如果是整体分析，列出表现最优和最差的 SKU；如果是单 SKU 分析，拆解其流量结构和订单转化)
## 4. 首席分析师的战略建议
(给出具体的、可落地的优化动作清单。包含：价格调整策略、广告出价模式、库存预警动作等)

${extraPrompt ? `**【用户特别指令 / 重点聚焦】**：\n${extraPrompt}\n请特别针对上述指令提供深度的解答和洞察。` : ''}`;

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
        model: 'deepseek-v4-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'AI 请求失败');
    }

    const result = await response.json();
    return result.choices[0].message.content;
  } catch (error: any) {
    console.error('DeepSeek Analysis Error:', error);
    throw error;
  }
}
