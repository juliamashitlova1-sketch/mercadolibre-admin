Component({
  data:{
    selected:0,
    list:[
      {path:'index', text:'首页',    iconType:'home'},
      {path:'category', text:'分类', iconType:'grid'},
      {path:'cart', text:'购物车',   iconType:'cart'},
      {path:'me', text:'我的',       iconType:'user'}
    ],
    cartCount:0
  },

  methods:{
    switchTab(e){
      const idx=parseInt(e.currentTarget.dataset.index)
      const urls=['/pages/index/index','/pages/category/category','/pages/cart/cart','/pages/me/me']
      if(this.data.selected===idx) return
      wx.switchTab({url:urls[idx]})
    }
  },

  lifetimes:{
    attached(){ this.sync() }
  },

  pageLifetimes:{
    show(){
      this.sync()
      try{
        const app=getApp()
        if(app){
          const cnt=(app.globalData.cartItems||[]).reduce((s,i)=>s+(i.quantity||1),0)
          this.setData({cartCount:cnt})
        }
      }catch(e){}
    }
  },

  sync(){
    try{
      const pages=getCurrentPages()
      const cur=pages[pages.length-1]
      let route=''
      if(cur&&cur.route){route=cur.route}
      let sel=0
      if(route.includes('/index')) sel=0
      else if(route.includes('/category')) sel=1
      else if(route.includes('/cart')) sel=2
      else if(route.includes('/me')) sel=3
      this.setData({selected:sel})
    }catch(e){this.setData({selected:0})}
  }
})
