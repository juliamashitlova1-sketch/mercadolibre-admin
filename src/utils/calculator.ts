export interface PlatformFeeResult {
  fixedFee: number;
  lastMileFee: number;
  volumetricWeight: number;
  ar59Weight: number;
}

/**
 * 计算美客多平台的固定费和尾程费
 * @param sellingPriceMxn 售价 (MXN)
 * @param productWeight 物理实重 (KG)
 * @param unitLength 包装长 (CM)
 * @param unitWidth 包装宽 (CM)
 * @param unitHeight 包装高 (CM)
 * @returns 费率计算结果
 */
export function calculatePlatformFees(
  sellingPriceMxn: number,
  productWeight: number,
  unitLength: number,
  unitWidth: number,
  unitHeight: number
): PlatformFeeResult {
  const volumetricWeight = (unitLength * unitWidth * unitHeight) / 6000;
  const ar59Weight = Math.max(productWeight, volumetricWeight);

  let fixedFee = 0;
  if (sellingPriceMxn > 0 && sellingPriceMxn < 299) {
    const buckets = [0.3, 0.5, 1, 2, 3, 4, 5, 7, 9, 12, 15, 20, 30, Infinity];
    const idx = buckets.findIndex(b => ar59Weight <= b);
    const tableA = [25, 28.5, 33, 35, 37, 39, 40, 45, 51, 59, 69, 81, 102, 126];
    const tableB = [32, 34, 38, 40, 46, 50, 53, 59, 67, 78, 92, 108, 137, 170];
    const tableC = [35, 38, 39, 41, 48, 54, 59, 70, 81, 96, 113, 140, 195, 250];

    if (sellingPriceMxn < 99) {
      fixedFee = tableA[idx];
    } else if (sellingPriceMxn < 199) {
      fixedFee = tableB[idx];
    } else {
      fixedFee = tableC[idx];
    }
  }

  let lastMileFee = 0;
  if (sellingPriceMxn >= 299) {
    const lmBuckets = [0.3, 0.5, 1, 2, 3, 4, 5, 7, 9, 12, 15, 20, 30, Infinity];
    const lmIdx = lmBuckets.findIndex(b => ar59Weight <= b);
    const lmTable299To499 = [52.40, 56.00, 59.60, 67.60, 76.00, 82.40, 88.00, 98.00, 111.60, 129.20, 152.00, 178.00, 225.20, 260];
    const lmTableAbove499 = [65.50, 70.00, 74.50, 84.50, 95.00, 103.00, 110.00, 122.50, 139.50, 161.50, 190.00, 222.50, 281.50, 320];

    if (sellingPriceMxn <= 499) {
      lastMileFee = lmTable299To499[lmIdx];
    } else {
      lastMileFee = lmTableAbove499[lmIdx];
    }
  }

  return { fixedFee, lastMileFee, volumetricWeight, ar59Weight };
}
