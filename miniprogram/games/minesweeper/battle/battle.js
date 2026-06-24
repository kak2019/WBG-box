const engine = require('../engine')
const renderer = require('../renderer')
const { watchRoom, closeWatcher, updateProgress, finishBattle } = require('../../../services/battle')

Page({
  data: {
    roomId: '',
    room: null,
    playing: false,
    finished: false,
    timeMs: 0,
    timeText: '0:00',
    flagCount: 0,
    mineCount: 0,
    opponentProgress: 0,
    canvasWidth: 300,
    canvasHeight: 400
  },

  board: null,
  rows: 0,
  cols: 0,
  layout: null,
  ctx: null,
  canvas: null,
  watcher: null,
  timer: null,
  startTime: 0,
  lastProgressReport: 0,
  longPressTimer: null,

  onLoad(options) {
    const { roomId } = options
    if (!roomId) return
    this.setData({ roomId })
    this.initCanvas()
    const { joinRoom } = require('../../../services/battle')
    joinRoom(roomId).then(res => {
      this.myOpenid = res.myOpenid
      this.watcher = watchRoom(roomId, room => this.onRoomUpdate(room))
    })
  },

  onUnload() {
    closeWatcher(this.watcher)
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
      })
  },

  onRoomUpdate(room) {
    this.setData({ room })

    if (!this.board && room.mapSeed && room.difficulty) {
      const { board, rows, cols, mineCount } = engine.generateBoard(room.mapSeed, room.difficulty)
      this.board = board
      this.rows = rows
      this.cols = cols
      this.layout = renderer.calcLayout(this.data.canvasWidth, this.data.canvasHeight, rows, cols)
      this.setData({ playing: true, mineCount, flagCount: 0 })
      if (room.startedAt) {
        this.startTime = room.startedAt
        this.startTimer()
      }
      this.render()
    }

    const myOpenid = this.myOpenid
    const opponentOpenid = room.hostOpenid === myOpenid ? room.guestOpenid : room.hostOpenid
    if (opponentOpenid && room.players && room.players[opponentOpenid]) {
      const opp = room.players[opponentOpenid]
      this.setData({
        opponentProgress: opp.progress || 0
      })
    }

    if (room.status === 'finished' && !this.data.finished) {
      this.showResult(room, myOpenid)
    }
  },

  startTimer() {
    this.stopTimer()
    this.timer = setInterval(() => {
      const timeMs = Date.now() - this.startTime
      const sec = Math.floor(timeMs / 1000)
      const min = Math.floor(sec / 60)
      const s = sec % 60
      this.setData({ timeMs, timeText: `${min}:${s.toString().padStart(2, '0')}` })
    }, 200)
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  render() {
    if (!this.ctx || !this.board || !this.layout) return
    const { ctx, board, rows, cols, layout } = this
    ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight)
    renderer.drawBoard(ctx, board, rows, cols, layout.cellSize, layout.offsetX, layout.offsetY)
  },

  reportProgress() {
    if (!this.board) return
    const progress = engine.computeProgress(this.board, this.rows, this.cols)
    if (progress - this.lastProgressReport >= 5) {
      this.lastProgressReport = progress
      updateProgress(this.data.roomId, progress).catch(() => {})
    }
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
    this.touchStart = { ...hit }
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
    this.reportProgress()

    if (result.hitMine) {
      engine.revealAllMines(this.board)
      this.render()
      this.onLose()
    } else if (engine.checkWin(this.board)) {
      this.onWin()
    }
    this.touchStart = null
  },

  onWin() {
    this.stopTimer()
    this.setData({ finished: true })
    finishBattle(this.data.roomId, 'minesweeper', {
      result: 'win',
      timeMs: this.data.timeMs
    }).catch(() => {})
  },

  onLose() {
    this.stopTimer()
    this.setData({ finished: true })
    finishBattle(this.data.roomId, 'minesweeper', {
      result: 'mine'
    }).catch(() => {})
  },

  showResult(room, myOpenid) {
    this.stopTimer()
    const isWin = room.winnerOpenid === myOpenid
    wx.showModal({
      title: isWin ? '🎉 你赢了！' : '对手获胜',
      showCancel: false,
      success: () => wx.navigateBack({ delta: 2 })
    })
  }
})
