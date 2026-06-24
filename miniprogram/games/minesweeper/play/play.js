const engine = require('../engine')
const renderer = require('../renderer')
const { submitMinesweeperScore } = require('../../../services/leaderboard')

Page({
  data: {
    difficulties: [],
    difficulty: 'medium',
    playing: false,
    finished: false,
    won: false,
    timeMs: 0,
    timeText: '0:00',
    flagCount: 0,
    mineCount: 0,
    canvasWidth: 300,
    canvasHeight: 400
  },

  board: null,
  rows: 0,
  cols: 0,
  layout: null,
  ctx: null,
  canvas: null,
  timer: null,
  startTime: 0,
  longPressTimer: null,

  onLoad() {
    const difficulties = Object.keys(engine.DIFFICULTIES).map(key => ({
      key,
      ...engine.DIFFICULTIES[key]
    }))
    this.setData({ difficulties })
    this.initCanvas()
  },

  onUnload() {
    this.stopTimer()
  },

  initCanvas() {
    const query = wx.createSelectorQuery()
    query
      .select('#mineCanvas')
      .fields({ node: true, size: true })
      .exec(res => {
        if (!res[0]) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getSystemInfoSync().pixelRatio
        const width = res[0].width
        const height = res[0].height
        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)
        this.canvas = canvas
        this.ctx = ctx
        this.setData({ canvasWidth: width, canvasHeight: height })
        this.startGame(this.data.difficulty)
      })
  },

  startGame(difficulty) {
    const seed = `solo_${difficulty}_${Date.now()}`
    const { board, rows, cols, mineCount } = engine.generateBoard(seed, difficulty)
    this.board = board
    this.rows = rows
    this.cols = cols
    this.layout = renderer.calcLayout(this.data.canvasWidth, this.data.canvasHeight, rows, cols)
    this.startTime = Date.now()
    this.startTimer()
    this.setData({
      difficulty,
      playing: true,
      finished: false,
      won: false,
      mineCount,
      flagCount: 0,
      timeMs: 0,
      timeText: '0:00'
    })
    this.render()
  },

  startTimer() {
    this.stopTimer()
    this.timer = setInterval(() => {
      const timeMs = Date.now() - this.startTime
      const sec = Math.floor(timeMs / 1000)
      const min = Math.floor(sec / 60)
      const s = sec % 60
      this.setData({
        timeMs,
        timeText: `${min}:${s.toString().padStart(2, '0')}`
      })
    }, 200)
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  render() {
    if (!this.ctx || !this.board) return
    const { ctx, board, rows, cols, layout } = this
    ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight)
    renderer.drawBoard(ctx, board, rows, cols, layout.cellSize, layout.offsetX, layout.offsetY)
  },

  onSelectDifficulty(e) {
    const key = e.currentTarget.dataset.key
    this.startGame(key)
  },

  onTouchStart(e) {
    if (this.data.finished || !this.layout) return
    const touch = e.touches[0]
    const hit = renderer.hitTest(
      touch.x,
      touch.y,
      this.rows,
      this.cols,
      this.layout.cellSize,
      this.layout.offsetX,
      this.layout.offsetY
    )
    if (!hit) return

    this.touchStart = { ...hit, time: Date.now() }
    this.longPressTimer = setTimeout(() => {
      engine.toggleFlag(this.board, this.rows, this.cols, hit.row, hit.col)
      this.setData({ flagCount: engine.countFlags(this.board) })
      this.render()
      this.touchStart = null
    }, 400)
  },

  onTouchEnd(e) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
    if (!this.touchStart || this.data.finished) return

    const touch = e.changedTouches[0]
    const hit = renderer.hitTest(
      touch.x,
      touch.y,
      this.rows,
      this.cols,
      this.layout.cellSize,
      this.layout.offsetX,
      this.layout.offsetY
    )
    if (!hit || hit.row !== this.touchStart.row || hit.col !== this.touchStart.col) {
      this.touchStart = null
      return
    }

    const result = engine.revealCell(this.board, this.rows, this.cols, hit.row, hit.col)
    this.render()

    if (result.hitMine) {
      engine.revealAllMines(this.board)
      this.render()
      this.onGameOver(false)
    } else if (engine.checkWin(this.board)) {
      this.onGameOver(true)
    }
    this.touchStart = null
  },

  onGameOver(won) {
    this.stopTimer()
    const { difficulty, timeMs } = this.data
    const score = engine.computeScore(difficulty, timeMs, won)
    this.setData({ finished: true, playing: false, won })

    wx.showModal({
      title: won ? '🎉 胜利！' : '💥 踩雷了',
      content: won ? `用时 ${this.data.timeText}\n得分 ${score}` : '再试一次吧',
      showCancel: false
    })

    if (won) {
      submitMinesweeperScore(difficulty, score, timeMs).catch(() => {})
    }
  },

  createBattle() {
    wx.navigateTo({
      url: `/pages/room/room?action=create&game=minesweeper&difficulty=${this.data.difficulty}`
    })
  },

  onReset() {
    this.startGame(this.data.difficulty)
  }
})
