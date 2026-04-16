const app = getApp()
const priceUtil = require('../../utils/price.js')

Page({
  data: {
    items: [],
    totalText: '¥0.00',
    scnt: 0,
    allSel: true,
    empty: true
  },

  onShow() {
    this.refreshFull()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().sync()
    }
  },

  // 完整刷新（拉取全局数据）
  refreshFull() {
    const cartItems = app.globalData.cartItems || []
    const items = cartItems.map(i => ({
      ...i,
      sel: i.selected !== false,
      qty: i.quantity || 1,
      priceText: priceUtil.formatPrice(i.price), // 取可能被SKU倍率覆盖的新价
      cartKey: i.id + '_' + (i.spec || '标准装')
    }))
    this.setData({ items, empty: items.length === 0 })
    this.recalc()
  },

  // 仅计算总价和角标（性能优化：不覆盖所有 items）
  recalc() {
    const its = this.data.items
    const selItems = its.filter(i => i.sel)
    const scnt = selItems.reduce((s, i) => s + i.qty, 0)
    const total = priceUtil.sumPrices(selItems)
    const allSel = its.length > 0 && its.every(i => i.sel)
    
    this.setData({
      totalText: priceUtil.formatPrice(total),
      scnt,
      allSel
    })

    // 同步到全局
    app.globalData.cartItems = its.map(x => ({
      ...x,
      selected: x.sel,
      quantity: x.qty
    }))
    wx.setStorageSync('cartItems', app.globalData.cartItems)
    app.updateCartBadge()
  },

  toggleOne(e) {
    const i = parseInt(e.currentTarget.dataset.i)
    const currentSel = this.data.items[i].sel
    // 性能优化：局部更新
    this.setData({
      [`items[${i}].sel`]: !currentSel
    }, () => {
      this.recalc()
    })
  },

  toggleAll() {
    const newSel = !this.data.allSel
    const its = this.data.items.map(i => ({ ...i, sel: newSel }))
    this.setData({ items: its }, () => {
      this.recalc()
    })
  },

  inc(e) {
    wx.vibrateShort({ type: 'light' }).catch(()=>{})
    const i = parseInt(e.currentTarget.dataset.i)
    const oldQty = this.data.items[i].qty
    this.setData({
      [`items[${i}].qty`]: oldQty + 1
    }, () => {
      this.recalc()
    })
  },

  dec(e) {
    wx.vibrateShort({ type: 'light' }).catch(()=>{})
    const i = parseInt(e.currentTarget.dataset.i)
    const oldQty = this.data.items[i].qty
    
    if (oldQty > 1) {
      this.setData({
        [`items[${i}].qty`]: oldQty - 1
      }, () => {
        this.recalc()
      })
    } else {
      wx.showModal({
        title: '移除商品',
        content: '确定要从购物车移除该商品吗？',
        success: r => {
          if (r.confirm) {
            const its = [...this.data.items]
            its.splice(i, 1)
            this.setData({ items: its, empty: its.length === 0 }, () => {
              this.recalc()
            })
          }
        }
      })
    }
  },

  delSel() {
    const selCount = this.data.items.filter(x => x.sel).length
    if (selCount === 0) {
      wx.showToast({ title: '尚未选择任何商品', icon: 'none' })
      return
    }
    wx.showModal({
      title: '批量移除',
      content: `确定要移除选中的 ${selCount} 件商品吗？`,
      confirmColor: '#d32f2f',
      success: r => {
        if (r.confirm) {
          const rem = this.data.items.filter(x => !x.sel)
          this.setData({ items: rem, empty: rem.length === 0 }, () => {
             this.recalc()
             wx.showToast({ title: '已移除', icon: 'success' })
          })
        }
      }
    })
  },

  checkout() {
    if (this.data.scnt <= 0) return
    if (!app.globalData.isLoggedIn) {
      wx.showModal({
        title: '温馨提示',
        content: '为了保障您的订单，请先登录或注册',
        confirmText: '去登录',
        success: r => {
          if (r.confirm) wx.switchTab({ url: '/pages/me/me' })
        }
      })
      return
    }
    wx.navigateTo({ url: '/pages/order/order?from=checkout' })
  },

  goShop() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})