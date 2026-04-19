import { SKUStats, OperationLog } from '../types';
import { MXN_TO_CNY } from '../constants';

const DEEPSEEK_API_KEY = 'sk-d983ac7159b94acbb66d8cc118048f16';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export async function analyzeStoreData(
  startDate: string,
  endDate: string,
  skuStats: SKUStats[],
  logs: OperationLog[]
) {
  // 1. Prepare data summary for AI context
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
    acc[curr.sku].totalProfit += curr.unitProfitExclAds * curr.orders - (curr.adSpend * MXN_TO_CNY); // Net profit in CNY
    acc[curr.sku].days += 1;
    acc[curr.sku].avgAcos = acc[curr.sku].totalAdSpend / (acc[curr.sku].totalSales || 1);
    return acc;
  }, {} as Record<string, any>);

  const logsSummary = logs.map(l => `[${l.date}] ${l.sku}: ${l.actionType} - ${l.description}`).join('\n');

  const systemPrompt = `你是一位专业的跨境电商（美客多/MercadoLibre）运营专家。
你的任务是根据提供的 SKU 销售数据和操作日志，进行深度分析。
重点分析：广告效率（ACOS/ROAS）、利润表现，以及操作记录对数据的影响。

数据范围：${startDate} 到 ${endDate}

请按以下格式输出分析报告（使用 Markdown）：
## 1. 整体表现概览
(总结这段时间的销售额、利润、广告总支出和整体 ACOS)
## 2. 核心 SKU 表现分析
(针对表现最好和最有问题的 SKU 进行拆解)
## 3. 操作行为影响评估
(结合操作日志分析，例如：调价、图片修改或广告调整后，数据有了什么具体变化？)
## 4. 优化建议与行动清单
(具体到 SKU 的优化动作：如降价、增减广告预算、清理库存等)`;

  const userPrompt = `以下是这段时间的数据汇总：
SKU 汇总数据：
${JSON.stringify(skuSummary, null, 2)}

操作日志记录：
${logsSummary || '无操作记录'}`;

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
