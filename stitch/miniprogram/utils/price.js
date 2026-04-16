/**
 * 价格工具函数 — 使用整数运算避免浮点精度问题
 */

/** 将元转为分（整数） */
function yuanToCent(yuan) {
  return Math.round(yuan * 100)
}

/** 分转元字符串 ¥xx.xx */
function centToYuan(cent) {
  return '¥' + (cent / 100).toFixed(2)
}

/** 格式化价格（元） */
function formatPrice(price) {
  if (typeof price !== 'number' || isNaN(price)) return '¥0.00'
  return '¥' + price.toFixed(2)
}

/** 安全求和（元数组 → 元） */
function sumPrices(items) {
  const totalCent = items.reduce((s, item) => {
    const qty = item.quantity || item.qty || 1
    return s + yuanToCent(item.price) * qty
  }, 0)
  return totalCent / 100
}

/** 计算折扣文本 */
function discountText(price, originalPrice) {
  if (!originalPrice || originalPrice <= 0) return ''
  const d = Math.round((price / originalPrice) * 10)
  return d + '折'
}

module.exports = {
  yuanToCent,
  centToYuan,
  formatPrice,
  sumPrices,
  discountText
}
