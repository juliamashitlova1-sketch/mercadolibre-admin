const app = getApp()
const priceUtil = require('../../utils/price.js')

Page({
  data: {
    pid: null,
    prod: {},
    specs: [],
    currentSpec: '标准装',
    fav: false,
    ccnt: 0,
    addr: '',

    // 计算后的价格
    basePrice: 0,
    baseOriginal: 0,
    priceText: '',
    originalPriceText: '',
    discountText: '',
    hasDiscount: false
  },

  onLoad(opt) {
    const id = parseInt(opt.id)
    const all = [...(app.globalData.products || []), ...(app.globalData.hotpotProducts || [])]
    let p = all.find(x => x.id === id)
    if (!p) {
      wx.navigateBack()
      return
    }

    const skuSpecs = app.globalData.skuSpecs || {}
    const specsArr = Object.keys(skuSpecs).map(k => ({
      name: k,
      multiplier: skuSpecs[k].multiplier,
      label: skuSpecs[k].label
    }))

    this.setData({
      pid: id,
      prod: p,
      specs: specsArr,
      basePrice: p.price,
      baseOriginal: p.originalPrice || p.price,
      fav: (wx.getStorageSync('favs') || []).includes(id),
      addr: (wx.getStorageSync('address') || {}).detailInfo || '',
      ccnt: app.getSelectedCount ? app.getSelectedCount() : 0
    })

    wx.setNavigationBarTitle({ title: p.name || '商品详情' })
    this.calcPrice()
  },

  onShow() {
    this.setData({
      ccnt: app.getSelectedCount ? app.getSelectedCount() : 0
    })
  },

  // ✨核心改进：切换SKU时动态计算真实售价
  calcPrice() {
    const { basePrice, baseOriginal, currentSpec, specs } = this.data
    const spec = specs.find(s => s.name === currentSpec)
    const multiplier = spec ? spec.multiplier : 1.0

    // 将基础价格与倍率相乘
    const currentPrice = basePrice * multiplier
    const currentOriginal = baseOriginal * multiplier

    const hasDiscount = currentOriginal > currentPrice

    this.setData({
      priceText: priceUtil.formatPrice(currentPrice),
      originalPriceText: priceUtil.formatPrice(currentOriginal),
      discountText: hasDiscount ? priceUtil.discountText(currentPrice, currentOriginal) : '',
      hasDiscount
    })
  },

  selSpec(e) {
    const specName = e.currentTarget.dataset.s
    if (this.data.currentSpec === specName) return
    this.setData({ currentSpec: specName })
    // 更新后重新计算价格
    this.calcPrice()
  },

  acart() {
    const { prod, currentSpec, specs, basePrice } = this.data
    const spec = specs.find(s => s.name === currentSpec)
    const multiplier = spec ? spec.multiplier : 1.0
    
    // 生成带特定价格的定制化商品对象，这样加入购物车的价格就是动态SKU价格了
    const SKUProd = {
      ...prod,
      price: basePrice * multiplier, // 重写真实购买价
      skuLabel: spec.label
    }

    app.addToCart(SKUProd, currentSpec)
    this.setData({ ccnt: app.getSelectedCount() })
  },

  buy() {
    this.acart()
    wx.navigateTo({ url: '/pages/order/order?from=buynow' })
  },

  goCart() {
    wx.switchTab({ url: '/pages/cart/cart' })
  },

  onFav() {
    const f = !this.data.fav
    let fvs = wx.getStorageSync('favs') || []
    if (f) {
      if (!fvs.includes(this.data.pid)) fvs.push(this.data.pid)
      wx.vibrateShort({ type: 'light' }).catch(() => {})
      wx.showToast({ title: '收藏成功', icon: 'success' })
    } else {
      const i = fvs.indexOf(this.data.pid)
      if (i > -1) fvs.splice(i, 1)
      wx.showToast({ title: '已取消', icon: 'none' })
    }
    wx.setStorageSync('favs', fvs)
    this.setData({ fav: f })
  },

  pickAddr() {
    wx.chooseAddress({
      success: r => {
        wx.setStorageSync('address', r)
        this.setData({ addr: r.detailInfo })
      }
    })
  },

  onShareAppMessage() {
    return {
      title: `${this.data.prod.name} 仅售${this.data.priceText}`,
      path: '/pages/product-detail/product-detail?id=' + this.data.pid
    }
  }
})