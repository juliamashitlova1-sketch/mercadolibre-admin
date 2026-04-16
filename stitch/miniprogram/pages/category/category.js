const app = getApp()
const priceUtil = require('../../utils/price.js')

Page({
  data: {
    userInfo: null,
    clist: [],
    curC: 'hotpot',
    curName: '火锅烤肉套装', // match categoryList name
    prods: [],
    empty: false
  },

  onLoad() {
    this.setData({
      clist: app.globalData.categoryList,
      curName: '火锅烤肉套装',
      prods: this.formatProds(app.globalData.hotpotProducts)
    })
  },

  onShow() {
    this.setData({ userInfo: app.globalData.userInfo })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().sync()
    }
  },

  formatProds(list) {
    if (!list || list.length === 0) return []
    return list.map(p => ({
      ...p,
      priceText: priceUtil.formatPrice(p.price),
      _loaded: !!p.image
    }))
  },

  onCatChange(e) {
    const id = e.currentTarget.dataset.id
    if (this.data.curC === id) return

    let prods = []
    let catName = '商品分类'

    if (id === 'hotpot') {
      prods = app.globalData.hotpotProducts
      catName = '火锅烤肉套装'
    } else if (id === 'all') {
      prods = app.globalData.products
      catName = '全部'
    } else {
      prods = (app.globalData.products || []).filter(p => p.category === id)
      const cat = (app.globalData.categoryList || []).find(c => c.id === id)
      catName = cat ? cat.name : catName
    }

    this.setData({ 
      curC: id, 
      curName: catName,
      prods: this.formatProds(prods),
      empty: prods.length === 0
    })
  },

  onImgErr(e) {
    const idx = e.currentTarget.dataset.index
    this.setData({
      [`prods[${idx}]._loaded`]: false
    })
  },

  toDetail(e) {
    const id = e.currentTarget.dataset.id
    const p = this.data.prods.find(x => x.id == id)
    if (p) {
      wx.navigateTo({
        url: '/pages/product-detail/product-detail?id=' + p.id
      })
    }
  },

  addCart(e) {
    const id = e.currentTarget.dataset.id
    const p = this.data.prods.find(x => x.id == id)
    if (p) app.addToCart(p, '标准装')
  },

  onSearch() {
    wx.showToast({ title: '搜索模块开发中', icon: 'none' })
  },

  goProfile() {
    wx.switchTab({ url: '/pages/me/me' })
  }
})