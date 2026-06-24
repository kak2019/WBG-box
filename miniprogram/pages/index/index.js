Page({
  data: {
    games: [
      {
        id: 'nonogram',
        name: '数织',
        desc: '根据行列提示填色解谜',
        emoji: '🧩',
        color: '#e94560'
      },
      {
        id: 'minesweeper',
        name: '扫雷',
        desc: '经典扫雷，小心地雷',
        emoji: '💣',
        color: '#0f9b58'
      }
    ]
  },

  goGame(e) {
    const id = e.currentTarget.dataset.id
    if (id === 'nonogram') {
      wx.navigateTo({ url: '/games/nonogram/play/play' })
    } else if (id === 'minesweeper') {
      wx.navigateTo({ url: '/games/minesweeper/play/play' })
    }
  },

  goLeaderboard() {
    wx.navigateTo({ url: '/pages/leaderboard/leaderboard' })
  }
})
