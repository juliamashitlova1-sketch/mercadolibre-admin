const app = getApp()
const priceUtil = require('../../utils/price.js')

Page({
  data: {
    location: '定位中...',
    userInfo: null,
    loaded: false,
    cats: [
      { id: 1, name: '鲜肉', icon: '肉', c: '#e11d48', bg: '#fff1f2', categoryId: 'fresh-meat' },
      { id: 2, name: '牛肉', icon: '牛', c: '#ea580c', bg: '#fff7ed', categoryId: 'beef' },
      { id: 3, name: '蔬菜', icon: '菜', c: '#d97706', bg: '#fef3c7', categoryId: 'vegetable' },
      { id: 4, name: '海鲜', icon: '鲜', c: '#0284c7', bg: '#e0f2fe', categoryId: 'seafood' },
      { id: 5, name: '火锅', icon: '锅', c: '#059669', bg: '#d1fae5', categoryId: 'hotpot' }
    ],
    products: []
  },

  onLoad() {
    this.setData({ location: app.globalData.location })
    // 模拟网络加载骨架屏
    setTimeout(() => {
      this.loadProducts()
    }, 400)
  },

  onShow() {
    this.setData({ userInfo: app.globalData.userInfo })
    
    // 如果底部分类更新了角标可以重新渲染
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().sync()
    }
  },

  loadProducts() {
    // 处理价格文本和占位加载标识
    const prods = (app.globalData.products || []).slice(0, 5).map(p => ({
      ...p,
      _loaded: !!p.image,
      priceText: priceUtil.formatPrice(p.price),
      originalPriceText: priceUtil.formatPrice(p.originalPrice),
      hasDiscount: p.originalPrice > p.price
    }))
    this.setData({ products: prods, loaded: true })
  },

  // 性能优化：按需更新单张图片的loaded状态，不全量重渲染
  onImgErr(e) {
    const idx = e.currentTarget.dataset.index
    // 采用数据路径单独更新出错的这一个图片状态
    this.setData({
      [`products[${idx}]._loaded`]: false
    })
  },

  goToSearch() {
    wx.showToast({ title: '搜索模块开发中，敬请期待', icon: 'none' })
  },

  onCatTap(e) {
    const id = e.currentTarget.dataset.id
    // 跳转前可尝试把选择分类传过去，目前先简单跳
    wx.switchTab({ url: '/pages/category/category' })
  },

  onRecharge() {
    if (!app.globalData.isLoggedIn) {
      wx.showModal({
        title: '生鲜馆欢迎您',
        content: '注册成为馆长俱乐部成员，首次加入即可享受免邮优惠！',
        confirmText: '立即加入',
        success: r => { if (r.confirm) wx.switchTab({ url: '/pages/me/me' }) }
      })
      return
    }
    wx.showToast({ title: '您已是VIP会员，全场免邮已激活', icon: 'none' })
  },

  toDetail(e) {
    const id = e.currentTarget.dataset.id
    const prod = this.data.products.find(p => p.id == id)
    if (!prod) return
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${prod.id}`
    })
  },

  addCart(e) {
    const id = e.currentTarget.dataset.id
    const prod = this.data.products.find(p => p.id == id)
    // 默认添加标准装
    if (prod) app.addToCart(prod, '标准装')
  },

  toCategory() {
    wx.switchTab({ url: '/pages/category/category' })
  },

  goToProfile() {
    wx.switchTab({ url: '/pages/me/me' })
  },

  onShareAppMessage() {
    return { title: 'Fresh Curator - 探索当季新鲜有机食材', path: '/pages/index/index' }
  }
})