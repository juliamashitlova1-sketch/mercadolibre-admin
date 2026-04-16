const app = getApp()

Page({
  data: {
    userInfo: null,
    loggedIn: false,
    nickName: '',
  },

  onLoad() {
    this.syncUserData()
  },

  onShow() {
    this.syncUserData()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().sync()
    }
  },

  syncUserData() {
    const userInfo = app.globalData.userInfo
    this.setData({
      userInfo: userInfo,
      loggedIn: app.globalData.isLoggedIn,
      nickName: userInfo ? (userInfo.nickName || '') : ''
    })
  },

  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl
    if (!avatarUrl) return

    const userInfo = {
      avatarUrl: avatarUrl,
      nickName: this.data.nickName || '微信用户'
    }
    app.globalData.userInfo = userInfo
    app.globalData.isLoggedIn = true
    wx.setStorageSync('userInfo', userInfo)
    
    this.setData({
      userInfo: userInfo,
      loggedIn: true,
      nickName: userInfo.nickName
    })
    
    wx.vibrateShort({ type: 'light' }).catch(()=>{})
    wx.showToast({ title: '登录成功', icon: 'success' })
  },

  onNicknameInput(e) {
    const nickName = e.detail.value
    this.setData({ nickName: nickName })
    if (app.globalData.userInfo) {
      app.globalData.userInfo.nickName = nickName
      wx.setStorageSync('userInfo', app.globalData.userInfo)
    }
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmColor: '#d32f2f',
      success: r => {
        if (r.confirm) {
          app.globalData.userInfo = null
          app.globalData.isLoggedIn = false
          wx.removeStorageSync('userInfo')
          this.setData({ userInfo: null, loggedIn: false, nickName: '' })
          wx.vibrateShort({ type: 'light' }).catch(()=>{})
        }
      }
    })
  },

  navTo(e) {
    const act = e.currentTarget.dataset.act
    if (!this.data.loggedIn && act !== 'contact') {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    if (act === 'address') {
      wx.navigateTo({ url: '/pages/address/address' })
    } else if (act === 'contact') {
      wx.makePhoneCall({ phoneNumber: '4001234567' }).catch(() => {})
    } else {
      wx.showToast({ title: '功能开发中', icon: 'none' })
    }
  },

  shrRwd() {
    wx.showShareMenu({ withShareTicket: true })
    wx.showToast({ title: '分享即可获得积分', icon: 'none', duration: 1500 })
  },

  onShareAppMessage() {
    return { title: 'Fresh Curator - 您的专属生鲜馆', path: '/pages/index/index' }
  }
})