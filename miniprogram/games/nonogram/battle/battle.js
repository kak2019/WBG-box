const engine = require('../engine')
const { watchRoom, closeWatcher, updateProgress, finishBattle } = require('../../../services/battle')

Page({
  data: {
    roomId: '',
    room: null,
    puzzle: null,
    cells: [],
    rows: 0,
    cols: 0,
    rowClues: [],
    colClues: [],
    cellSize: 48,
    finished: false,
    timeMs: 0,
    timeText: '0:00',
    opponentProgress: 0,
    opponentFinished: false
  },

  watcher: null,
  timer: null,
  startTime: 0,
  lastProgressReport: 0,

  onLoad(options) {
    const { roomId } = options
    if (!roomId) {
      wx.showToast({ title: '无效房间', icon: 'none' })
      return
    }
    this.setData({ roomId })
    const { joinRoom } = require('../../../services/battle')
    joinRoom(roomId).then(res => {
      this.myOpenid = res.myOpenid
      this.startWatch(roomId)
    })
  },

  onUnload() {
    closeWatcher(this.watcher)
    this.stopTimer()
  },

  startWatch(roomId) {
    this.watcher = watchRoom(roomId, room => {
      this.onRoomUpdate(room)
    })
  },

  onRoomUpdate(room) {
    if (!this.data.puzzle && room.puzzleId) {
      const puzzle = engine.getPuzzle(room.puzzleId)
      const cells = engine.createCellStates(puzzle.rows, puzzle.cols)
      const cellSize = Math.min(560 / puzzle.cols, 48)
      this.setData({
        room,
        puzzle,
        cells,
        rows: puzzle.rows,
        cols: puzzle.cols,
        rowClues: puzzle.rowClues,
        colClues: puzzle.colClues,
        cellSize
      })
      if (room.startedAt && !this.timer) {
        this.startTime = room.startedAt
        this.startTimer()
      }
    } else {
      this.setData({ room })
    }

    const myOpenid = this.myOpenid || room.myOpenid
    const opponentOpenid = room.hostOpenid === myOpenid ? room.guestOpenid : room.hostOpenid
    if (opponentOpenid && room.players && room.players[opponentOpenid]) {
      const opp = room.players[opponentOpenid]
      this.setData({
        opponentProgress: opp.progress || 0,
        opponentFinished: opp.finished || false
      })
    }

    if (room.status === 'finished' && !this.data.finished) {
      this.showBattleResult(room, myOpenid)
    }
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

  onCellTap(e) {
    if (this.data.finished || !this.data.puzzle) return
    const idx = e.currentTarget.dataset.idx
    const { cells, cols, puzzle, roomId } = this.data
    cells[idx] = engine.cycleCellState(cells[idx])
    this.setData({ cells })

    const progress = engine.computeProgress(cells, puzzle)
    if (progress - this.lastProgressReport >= 5) {
      this.lastProgressReport = progress
      updateProgress(roomId, progress).catch(() => {})
    }

    if (engine.checkWin(cells, puzzle)) {
      this.onWin()
    }
  },

  onWin() {
    this.stopTimer()
    this.setData({ finished: true })
    const { roomId, timeMs, puzzle } = this.data

    finishBattle(roomId, 'nonogram', {
      result: 'win',
      timeMs,
      proof: engine.solutionHash(puzzle)
    })
      .then(res => {
        wx.showModal({
          title: res.isWinner ? '🎉 你赢了！' : '对手更快！',
          content: res.isWinner ? `用时 ${this.data.timeText}` : '下次加油',
          showCancel: false,
          success: () => wx.navigateBack({ delta: 2 })
        })
      })
      .catch(err => wx.showToast({ title: err.message, icon: 'none' }))
  },

  showBattleResult(room, myOpenid) {
    this.stopTimer()
    const isWin = room.winnerOpenid === myOpenid
    wx.showModal({
      title: isWin ? '🎉 你赢了！' : '对手获胜',
      showCancel: false,
      success: () => wx.navigateBack({ delta: 2 })
    })
  }
})
