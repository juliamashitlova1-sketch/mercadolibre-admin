const app = getApp()
const priceUtil = require('../../utils/price.js')

Page({
  data: {
    items: [],
    addr: null,
    remark: '',
    gtText: '',
    dcText: '',
    ftText: ''
  },

  onLoad(opt) {
    let its = []
    if (opt.from === 'buynow') {
      const ci = app.globalData.cartItems || []
      if (ci.length) {
        its = [{ ...ci[ci.length - 1] }]
      }
    } else {
      its = (app.globalData.cartItems || []).filter(i => i.selected !== false).map(i => ({ ...i }))
    }
    
    if (!its.length) {
      wx.showToast({ title: '无结算商品', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1200)
      return
    }

    // 预处理
    const items = its.map(i => ({
      ...i,
      priceText: priceUtil.formatPrice(i.price),
      qtyText: 'x' + (i.quantity || 1)
    }))

    // 使用 utils/price 解决浮点运算精度问题
    const grossCentTotal = items.reduce((s, i) => {
      const pCents = priceUtil.yuanToCent(i.price)
      return s + pCents * (i.quantity || 1)
    }, 0)
    
    // 折扣计算：当前默认打95折（模拟超级会员）
    const discountCents = Math.floor(grossCentTotal * 0.05)
    const finalCents = grossCentTotal - discountCents

    this.setData({
      items,
      addr: wx.getStorageSync('address') || null,
      gtText: priceUtil.centToYuan(grossCentTotal),
      dcText: '- ' + priceUtil.centToYuan(discountCents),
      ftText: priceUtil.centToYuan(finalCents)
    })
    wx.setNavigationBarTitle({ title: '确认订单' })
  },

  onRm(e) {
    this.setData({ remark: e.detail.value })
  },

  pickAddr() {
    wx.chooseAddress({
      success: r => {
        wx.setStorageSync('address', r)
        this.setData({ addr: r })
      }
    })
  },

  submit() {
    if (!this.data.addr) {
      wx.showToast({ title: '请先选择收货地址', icon: 'none' })
      return
    }
    wx.showLoading({ title: '提交中...' })
    setTimeout(() => {
      wx.hideLoading()
      
      // 支付成功：清理购物车中被结算的商品
      const rem = (app.globalData.cartItems || []).filter(
        i => !this.data.items.find(x => (x.id + '_' + (x.spec||'标准装')) === (i.id + '_' + (i.spec||'标准装')))
      )
      app.globalData.cartItems = rem
      wx.setStorageSync('cartItems', rem)
      try { app.updateCartBadge() } catch (e) {}

      wx.vibrateSuccess && wx.vibrateSuccess()

      wx.showModal({
        title: '支付成功',
        content: `实付金额 ${this.data.ftText}\n我们正在快速为您处理包裹`,
        showCancel: false,
        confirmText: '返回首页',
        confirmColor: '#3a6b00',
        success: () => {
          wx.switchTab({ url: '/pages/index/index' })
        }
      })
    }, 1200)
  }
})