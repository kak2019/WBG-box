const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

function generateRoomId() {
  return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function generateMapSeed() {
  return 'map_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { gameType, puzzleId, difficulty } = event

  if (!gameType || !['nonogram', 'minesweeper'].includes(gameType)) {
    return { error: '无效的游戏类型' }
  }

  const roomId = generateRoomId()
  const now = Date.now()

  const room = {
    _id: roomId,
    gameType,
    mode: 'race',
    puzzleId: puzzleId || 'daily',
    mapSeed: generateMapSeed(),
    difficulty: difficulty || 'medium',
    hostOpenid: openid,
    guestOpenid: null,
    status: 'waiting',
    players: {
      [openid]: {
        ready: false,
        progress: 0,
        finished: false,
        finishTimeMs: null,
        finishAt: null
      }
    },
    winnerOpenid: null,
    winReason: null,
    createdAt: now,
    startedAt: null,
    expiresAt: now + 10 * 60 * 1000
  }

  await db.collection('rooms').doc(roomId).set({ data: room })

  return { roomId, room, myOpenid: openid }
}
