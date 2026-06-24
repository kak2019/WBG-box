const engine = require('../engine')

Page({
  data: {
    levels: [],
    selectedLevelId: 'tutorial',
    level: null,
    cars: [],
    carViews: [],
    cellSize: 88,
    boardSize: 528,
    moves: 0,
    minMoves: 0,
    timeMs: 0,
    timeText: '0:00',
    finished: false,
    hintText: '',
    selectedCarId: ''
  },

  timer: null,
  startTime: 0,
  hintIndex: 0,
  touchStart: null,

  onLoad() {
    const levels = engine.listLevels()
    this.loadLevel('tutorial')
    this.setData({ levels, selectedLevelId: 'tutorial' })
  },

  onUnload() {
    this.stopTimer()
  },

  loadLevel(levelId) {
    const { level, cars } = engine.initLevel(levelId)
    const cellSize = 88
    this.hintIndex = 0
    this.startTime = Date.now()
    this.startTimer()
    this.setData({
      level,
      selectedLevelId: levelId,
      cars,
      carViews: engine.carsToRender(cars, cellSize),
      cellSize,
      boardSize: engine.BOARD_COLS * cellSize,
      moves: 0,
      minMoves: level.minMoves,
      finished: false,
      hintText: '',
      selectedCarId: '',
      timeMs: 0,
      timeText: '0:00'
    })
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

  onSelectLevel(e) {
    const id = e.currentTarget.dataset.id
    this.loadLevel(id)
  },

  onCarTouchStart(e) {
    if (this.data.finished) return
    const carId = e.currentTarget.dataset.id
    const touch = e.touches[0]
    this.touchStart = { carId, x: touch.clientX, y: touch.clientY }
    this.setData({ selectedCarId: carId })
  },

  onCarTouchEnd(e) {
    if (this.data.finished || !this.touchStart) return

    const touch = e.changedTouches[0]
    const dx = touch.clientX - this.touchStart.x
    const dy = touch.clientY - this.touchStart.y
    const carId = this.touchStart.carId
    this.touchStart = null

    const threshold = 20
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
      this.setData({ selectedCarId: carId })
      return
    }

    const car = this.data.cars.find(c => c.id === carId)
    if (!car) return

    let direction = 0
    if (car.orientation === 'h') {
      if (Math.abs(dx) <= Math.abs(dy)) return
      direction = dx > 0 ? 1 : -1
    } else {
      if (Math.abs(dy) <= Math.abs(dx)) return
      direction = dy > 0 ? 1 : -1
    }

    this.slideCar(carId, direction)
  },

  slideCar(carId, direction) {
    const { cars, cellSize, level } = this.data
    const result = engine.trySlide(cars, carId, direction, 99)
    if (result.moved <= 0) return

    const newMoves = this.data.moves + 1
    const carViews = engine.carsToRender(result.cars, cellSize)

    this.setData({
      cars: result.cars,
      carViews,
      moves: newMoves,
      hintText: '',
      selectedCarId: carId
    })

    if (engine.isWin(result.cars)) {
      this.onWin(newMoves, level)
    }
  },

  onWin(moves, level) {
    this.stopTimer()
    const { timeMs, timeText } = this.data
    const score = engine.computeScore(level, moves, timeMs)
    const optimal = moves <= level.minMoves ? '🌟 最优步数！' : `最佳步数 ${level.minMoves}`

    this.setData({ finished: true })

    wx.showModal({
      title: '🎉 主车成功出库！',
      content: `步数 ${moves}（${optimal}）\n用时 ${timeText}\n得分 ${score}`,
      showCancel: false
    })
  },

  onHint() {
    if (this.data.finished) return
    const hint = engine.getHint(this.data.cars, this.hintIndex)
    if (!hint) {
      wx.showToast({ title: '无法求解', icon: 'none' })
      return
    }

    const car = this.data.cars.find(c => c.id === hint.carId)
    const dirText =
      car.orientation === 'h'
        ? hint.direction > 0
          ? '右'
          : '左'
        : hint.direction > 0
          ? '下'
          : '上'

    this.hintIndex++
    this.setData({
      hintText: `提示：滑动${car.isMain ? '红车' : '车辆 ' + hint.carId} 向${dirText}`,
      selectedCarId: hint.carId
    })
  },

  onReset() {
    this.loadLevel(this.data.selectedLevelId)
  }
})
