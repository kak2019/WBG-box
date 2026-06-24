const { createRoom, joinRoom, setReady, watchRoom, closeWatcher } = require('../../services/battle')

const GAME_NAMES = {
  nonogram: '数织',
  minesweeper: '扫雷'
}

function buildPlayerStatus(room) {
  if (!room) return { hostStatus: '...', guestStatus: '等待加入...' }

  const host = room.players && room.players[room.hostOpenid]
  const guest = room.guestOpenid && room.players && room.players[room.guestOpenid]

  return {
    hostStatus: host ? (host.ready ? '✅ 已准备' : '等待准备') : '...',
    guestStatus: room.guestOpenid
      ? guest
        ? guest.ready
          ? '✅ 已准备'
          : '等待准备'
        : '...'
      : '等待加入...'
  }
}

Page({
  data: {
    roomId: '',
    gameType: 'nonogram',
    puzzleId: 'daily',
    difficulty: 'medium',
    isHost: false,
    myOpenid: '',
    room: null,
    hostStatus: '...',
    guestStatus: '等待加入...',
    loading: true,
    error: ''
  },

  watcher: null,

  onLoad(options) {
    const { roomId, game, puzzleId, difficulty, action } = options
    const gameType = game || 'nonogram'

    this.setData({
      gameType,
      puzzleId: puzzleId || 'daily',
      difficulty: difficulty || 'medium'
    })

    if (action === 'create') {
      this.doCreateRoom(gameType)
    } else if (roomId) {
      this.setData({ roomId })
      this.doJoinRoom(roomId)
    } else {
      this.setData({ loading: false, error: '无效的房间链接' })
    }
  },

  onUnload() {
    closeWatcher(this.watcher)
  },

  doCreateRoom(gameType) {
    createRoom(gameType, {
      puzzleId: this.data.puzzleId,
      difficulty: this.data.difficulty
    })
      .then(res => {
        this.setData({
          roomId: res.roomId,
          isHost: true,
          myOpenid: res.myOpenid,
          loading: false
        })
        this.startWatch(res.roomId)
      })
      .catch(err => {
        this.setData({ loading: false, error: err.message || '创建房间失败' })
      })
  },

  doJoinRoom(roomId) {
    joinRoom(roomId)
      .then(res => {
        this.setData({
          roomId,
          isHost: res.isHost,
          myOpenid: res.myOpenid,
          gameType: res.gameType || this.data.gameType,
          loading: false
        })
        this.startWatch(roomId)
      })
      .catch(err => {
        this.setData({ loading: false, error: err.message || '加入房间失败' })
      })
  },

  startWatch(roomId) {
    closeWatcher(this.watcher)
    this.watcher = watchRoom(
      roomId,
      room => this.onRoomUpdate({ ...room, myOpenid: this.data.myOpenid }),
      err => console.error(err)
    )
  },

  onRoomUpdate(room) {
    const status = buildPlayerStatus(room)
    this.setData({ room, ...status })

    if (room.status === 'playing') {
      this.enterBattle(room)
    } else if (room.status === 'finished') {
      this.showResult(room)
    } else if (room.status === 'expired') {
      wx.showModal({
        title: '房间已过期',
        showCancel: false,
        success: () => wx.navigateBack()
      })
    }
  },

  enterBattle(room) {
    closeWatcher(this.watcher)
    const { gameType, _id: roomId } = room
    const url =
      gameType === 'nonogram'
        ? `/games/nonogram/battle/battle?roomId=${roomId}`
        : `/games/minesweeper/battle/battle?roomId=${roomId}`
    wx.redirectTo({ url })
  },

  showResult(room) {
    const isWin = room.winnerOpenid === this.data.myOpenid
    wx.showModal({
      title: room.winReason === 'opponent_mine' ? '对手踩雷！' : '对战结束',
      content: isWin ? '🎉 你赢了！' : '对手获胜',
      showCancel: false,
      success: () => wx.navigateBack()
    })
  },

  onReady() {
    setReady(this.data.roomId)
      .then(() => wx.showToast({ title: '已准备', icon: 'success' }))
      .catch(err => wx.showToast({ title: err.message, icon: 'none' }))
  },

  onShareAppMessage() {
    const { roomId, gameType, puzzleId, difficulty } = this.data
    return {
      title: `来和我对战${GAME_NAMES[gameType] || '游戏'}！`,
      path: `/pages/room/room?roomId=${roomId}&game=${gameType}&puzzleId=${puzzleId}&difficulty=${difficulty}`
    }
  }
})
