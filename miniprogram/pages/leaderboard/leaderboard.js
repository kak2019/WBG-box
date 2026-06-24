const { getLeaderboard } = require('../../services/leaderboard')

const TABS = [
  { key: 'nonogram_time', gameType: 'nonogram', scoreType: 'time', puzzleId: 'daily', label: '数织用时' },
  { key: 'nonogram_score', gameType: 'nonogram', scoreType: 'score', puzzleId: 'daily', label: '数织高分' },
  { key: 'minesweeper_score', gameType: 'minesweeper', scoreType: 'score', puzzleId: 'medium', label: '扫雷高分' }
]

function formatTime(ms) {
  if (!ms && ms !== 0) return '--'
  const sec = Math.floor(ms / 1000)
  const min = Math.floor(sec / 60)
  const s = sec % 60
  return min > 0 ? `${min}分${s}秒` : `${s}秒`
}

Page({
  data: {
    tabs: TABS,
    activeTab: 0,
    list: [],
    loading: true,
    myRecord: null
  },

  onLoad() {
    this.loadData()
  },

  onTabChange(e) {
    const idx = Number(e.currentTarget.dataset.index)
    this.setData({ activeTab: idx, loading: true })
    this.loadData()
  },

  loadData() {
    const tab = TABS[this.data.activeTab]
    this.setData({ loading: true })

    getLeaderboard(tab.gameType, tab.scoreType, tab.puzzleId)
      .then(res => {
        const list = (res.list || []).map((item, index) => ({
          ...item,
          rank: index + 1,
          displayValue: tab.scoreType === 'time' ? formatTime(item.timeMs) : String(item.score || 0)
        }))
        const myRecord = res.myRecord
          ? {
              ...res.myRecord,
              displayValue:
                tab.scoreType === 'time'
                  ? formatTime(res.myRecord.timeMs)
                  : String(res.myRecord.score || 0)
            }
          : null
        this.setData({ list, myRecord, loading: false })
      })
      .catch(err => {
        console.error(err)
        wx.showToast({ title: '加载失败', icon: 'none' })
        this.setData({ list: [], loading: false })
      })
  },

  onPullDownRefresh() {
    this.loadData()
    wx.stopPullDownRefresh()
  }
})
