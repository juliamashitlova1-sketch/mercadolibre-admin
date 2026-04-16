Page({
  data: { addrs: [], ci: -1 },
  
  onLoad() { this.load() },
  onShow() { this.load() },

  load() {
    const a = wx.getStorageSync('addrs') || []
    const da = wx.getStorageSync('address')
    // 若当前无默认地址且缓存有选择记录，则把记录加进去
    if (da && !a.find(x => x.telNumber === da.telNumber)) {
      a.unshift({ ...da, isDefault: true })
    }
    
    // 找出当前选中的地址下标
    let ci = 0;
    if (da) {
      const idx = a.findIndex(x => x.telNumber === da.telNumber && x.userName === da.userName)
      if (idx > -1) ci = idx
    }

    this.setData({ addrs: a, ci: ci })
  },

  selAddr(e) {
    const i = parseInt(e.currentTarget.dataset.i)
    this.setData({ ci: i })
    wx.setStorageSync('address', this.data.addrs[i])
    wx.vibrateShort({ type: 'light' }).catch(()=>{})
    setTimeout(() => wx.navigateBack(), 300)
  },

  addNew() {
    wx.chooseAddress({
      success: r => {
        if (!r.userName || !r.telNumber) {
          wx.showToast({ title: '地址信息缺失', icon: 'none' })
          return
        }
        const na = { ...r, id: Date.now() }
        const oldAddrs = this.data.addrs
        const addrs = [na, ...oldAddrs]
        wx.setStorageSync('addrs', addrs)
        wx.setStorageSync('address', na)
        this.setData({ addrs, ci: 0 })
        
        wx.vibrateShort({ type: 'light' }).catch(()=>{})
        wx.showToast({ title: '保存成功', icon: 'success' })
      }
    })
  },

  editA() {
    wx.showToast({ title: '微信原生地图编辑开发中', icon: 'none' })
  },

  delA(e) {
    const i = parseInt(e.currentTarget.dataset.i)
    wx.showModal({
      title: '删除地址',
      content: '确定要删除这条收货地址吗？',
      confirmColor: '#d32f2f',
      success: r => {
        if (r.confirm) {
          const a = [...this.data.addrs]
          a.splice(i, 1)
          wx.setStorageSync('addrs', a)
          if (this.data.ci === i) wx.removeStorageSync('address')
          
          this.setData({ addrs: a, ci: Math.max(0, this.data.ci - 1) })
          wx.vibrateShort({ type: 'light' }).catch(()=>{})
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  }
})