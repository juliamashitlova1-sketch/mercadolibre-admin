const priceUtil = require('./utils/price.js')

App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    cartItems: [],
    location: '绿谷广场',

    categories: [
      { id: 0, name: '全部', icon: '☰' },
      { id: 1, name: '肉类', icon: '肉', color: '#e11d48', bgColor: '#fff1f2' },
      { id: 2, name: '牛肉', icon: '牛', color: '#ea580c', bgColor: '#fff7ed' },
      { id: 3, name: '面点', icon: '面', color: '#d97706', bgColor: '#fef3c7' },
      { id: 4, name: '休闲零食', icon: '零', color: '#65a30d', bgColor: '#ecfccb' },
      { id: 5, name: '火锅', icon: '锅', color: '#059669', bgColor: '#d1fae5' },
      { id: 6, name: '海鲜', icon: '鲜', color: '#0284c7', bgColor: '#e0f2fe' }
    ],

    categoryList: [
      { id: 'all', name: '全部' },
      { id: 'group', name: '团购产品' },
      { id: 'hotpot', name: '火锅烤肉套装' },
      { id: 'angus', name: '安格斯类' },
      { id: 'fresh-meat', name: '鲜肉类' },
      { id: 'seafood', name: '海鲜类' },
      { id: 'sauce', name: '蘸料类' },
      { id: 'vegetable', name: '蔬菜类' },
      { id: 'beef', name: '牛肉类' }
    ],

    // SKU 规格定义
    skuSpecs: {
      '标准装': { multiplier: 1.0,  label: '标准装 · 1人份' },
      '家庭装': { multiplier: 1.8,  label: '家庭装 · 3-4人份' },
      '礼盒装': { multiplier: 2.5,  label: '礼盒装 · 精美包装' }
    },

    products: [
      {
        id: 1, name: '高品质传家宝番茄', tag: '有机农场', tagColor: 'primary',
        price: 12.90, originalPrice: 18.00, image: '',
        category: 'vegetable', description: '精选有机农场新鲜采摘，口感甜美多汁',
        sales: 328, weight: '500g'
      },
      {
        id: 2, name: '澳洲肉眼牛排', tag: '草饲养殖', tagColor: 'secondary',
        price: 24.50, originalPrice: 30.00, image: '',
        category: 'beef', description: '澳洲进口优质草饲牛肉，大理石纹理丰富',
        sales: 256, weight: '300g'
      },
      {
        id: 3, name: '火锅套餐A（单人餐）', tag: '热销', tagColor: 'secondary',
        price: 88.00, originalPrice: 128.00, image: '',
        category: 'hotpot', description: '包含安格斯肥牛卷，什锦蘑菇拼盘，以及特色麻辣底料',
        sales: 512, weight: '约800g'
      },
      {
        id: 4, name: '豪华家庭聚会套装', tag: '推荐', tagColor: 'primary',
        price: 398.00, originalPrice: 520.00, image: '',
        category: 'hotpot', description: '4-6人共享的极致盛宴，包含高档海鲜和手工切割和牛',
        sales: 186, weight: '约2.5kg'
      },
      {
        id: 5, name: '田园蔬菜套装', tag: '健康', tagColor: 'primary',
        price: 64.00, originalPrice: 88.00, image: '',
        category: 'vegetable', description: '轻盈营养，包含12种季节性有机绿叶菜和高品质嫩豆腐',
        sales: 423, weight: '约1kg'
      },
      {
        id: 6, name: '川味麻辣牛肉组合', tag: '新品', tagColor: 'tertiary',
        price: 112.00, originalPrice: 148.00, image: '',
        category: 'hotpot', description: '嗜辣星人必备，大理石花纹牛肉搭配获奖的牛油火锅底料',
        sales: 97, weight: '约600g'
      },
      {
        id: 7, name: '挪威三文鱼刺身', tag: '空运', tagColor: 'tertiary',
        price: 168.00, originalPrice: 218.00, image: '',
        category: 'seafood', description: '挪威纯净海域空运直达，冰鲜切片即食',
        sales: 145, weight: '300g'
      },
      {
        id: 8, name: '和牛雪花肥牛卷', tag: '人气王', tagColor: 'secondary',
        price: 78.00, originalPrice: 108.00, image: '',
        category: 'beef', description: 'A5级和牛薄切卷，入口即化的极致口感',
        sales: 634, weight: '250g'
      }
    ],

    hotpotProducts: [
      {
        id: 101, name: '火锅套餐A（单人餐）', tag: '热销', tagColor: 'secondary',
        price: 88.00, originalPrice: 128.00, image: '',
        description: '包含安格斯肥牛卷，什锦蘑菇拼盘，以及我们的特色麻辣底料。',
        sales: 512, weight: '约800g'
      },
      {
        id: 102, name: '豪华家庭聚会套装', tag: '推荐', tagColor: 'primary',
        price: 398.00, originalPrice: 520.00, image: '',
        description: '4-6人共享的极致盛宴。包含高档海鲜和手工切割和牛。',
        sales: 186, weight: '约2.5kg'
      },
      {
        id: 103, name: '田园蔬菜套装', tag: '健康', tagColor: 'primary',
        price: 64.00, originalPrice: 88.00, image: '',
        description: '轻盈营养，包含12种季节性有机绿叶菜和高品质嫩豆腐。',
        sales: 423, weight: '约1kg'
      },
      {
        id: 104, name: '川味麻辣牛肉组合', tag: '新品', tagColor: 'tertiary',
        price: 112.00, originalPrice: 148.00, image: '',
        description: '嗜辣星人必备，大理石花纹牛肉搭配我们获奖的牛油火锅底料。',
        sales: 97, weight: '约600g'
      }
    ]
  },

  onLaunch() {
    const cartItems = wx.getStorageSync('cartItems') || []
    this.globalData.cartItems = cartItems

    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
      this.globalData.isLoggedIn = true
    }

    this.updateCartBadge()
  },

  updateCartBadge() {
    if (typeof wx.getTabBar === 'function') {
      const tabBar = wx.getTabBar()
      if (tabBar && tabBar.setData) {
        const count = this.globalData.cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0)
        tabBar.setData({ cartCount: count })
      }
    }
  },

  addToCart(product, spec) {
    const specName = spec || '标准装'
    const cartKey = product.id + '_' + specName
    const existingIndex = this.globalData.cartItems.findIndex(item => (item.id + '_' + (item.spec || '标准装')) === cartKey)

    if (existingIndex > -1) {
      this.globalData.cartItems[existingIndex].quantity += 1
    } else {
      this.globalData.cartItems.push({
        ...product,
        spec: specName,
        quantity: 1,
        selected: true
      })
    }

    wx.setStorageSync('cartItems', this.globalData.cartItems)
    this.updateCartBadge()

    wx.vibrateShort({ type: 'light' }).catch(() => {})
    wx.showToast({ title: '已加入购物车', icon: 'success', duration: 800 })
  },

  getCartTotal() {
    return priceUtil.sumPrices(
      this.globalData.cartItems.filter(item => item.selected !== false)
    )
  },

  getSelectedCount() {
    return this.globalData.cartItems
      .filter(item => item.selected !== false)
      .reduce((sum, item) => sum + (item.quantity || 1), 0)
  },

  formatPrice(price) {
    return priceUtil.formatPrice(price)
  }
})