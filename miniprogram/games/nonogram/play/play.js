const engine = require('../engine')
const { submitNonogramTime, submitNonogramScore } = require('../../../services/leaderboard')

Page({
  data: {
    puzzles: [],
    selectedPuzzleId: 'easy_01',
    puzzle: null,
    cells: [],
    rows: 0,
    cols: 0,
    rowClues: [],
    colClues: [],
    cellSize: 48,
    playing: false,
    finished: false,
    timeMs: 0,
    timeText: '0:00',
    mistakes: 0
  },

  timer: null,
  startTime: 0,

  onLoad() {
    const puzzles = engine.listPuzzles()
    const puzzle = engine.getPuzzle('easy_01')
    this.initPuzzle(puzzle)
    this.setData({ puzzles, selectedPuzzleId: puzzle.id })
  },

  onUnload() {
    this.stopTimer()
  },

  initPuzzle(puzzle) {
    const cells = engine.createCellStates(puzzle.rows, puzzle.cols)
    const cellSize = Math.min(560 / puzzle.cols, 48)
    this.setData({
      puzzle,
      cells,
      rows: puzzle.rows,
      cols: puzzle.cols,
      rowClues: puzzle.rowClues,
      colClues: puzzle.colClues,
      cellSize,
      playing: true,
      finished: false,
      timeMs: 0,
      timeText: '0:00',
      mistakes: 0
    })
    this.startTimer()
  },

  startTimer() {
    this.stopTimer()
    this.startTime = Date.now()
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

  onSelectPuzzle(e) {
    const id = e.currentTarget.dataset.id
    const puzzle = engine.getPuzzle(id)
    this.initPuzzle(puzzle)
    this.setData({ selectedPuzzleId: id })
  },

  onCellTap(e) {
    if (this.data.finished) return
    const idx = e.currentTarget.dataset.idx
    const { cells, cols, rows, puzzle } = this.data
    const row = Math.floor(idx / cols)
    const col = idx % cols
    const newState = engine.cycleCellState(cells[idx])
    cells[idx] = newState

    if (newState === 1 && puzzle.solution[row][col] === 0) {
      this.setData({ mistakes: this.data.mistakes + 1 })
    }

    this.setData({ cells })

    if (engine.checkWin(cells, puzzle)) {
      this.onWin()
    }
  },

  onWin() {
    this.stopTimer()
    const { puzzle, timeMs, mistakes } = this.data
    const score = engine.computeScore(puzzle, timeMs, mistakes)
    this.setData({ finished: true, playing: false })

    wx.showModal({
      title: '恭喜通关！',
      content: `用时 ${this.data.timeText}\n得分 ${score}`,
      showCancel: false
    })

    submitNonogramTime(puzzle.id, timeMs).catch(() => {})
    submitNonogramScore(puzzle.id, score).catch(() => {})
  },

  onReset() {
    const puzzle = engine.getPuzzle(this.data.selectedPuzzleId)
    this.initPuzzle(puzzle)
  },

  createBattle() {
    wx.navigateTo({
      url: `/pages/room/room?action=create&game=nonogram&puzzleId=${this.data.selectedPuzzleId}`
    })
  }
})
