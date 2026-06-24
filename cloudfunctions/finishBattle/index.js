const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { roomId, gameType, result, timeMs } = event

  if (!roomId) {
    return { error: '缺少房间 ID' }
  }

  const roomRes = await db.collection('rooms').doc(roomId).get()
  if (!roomRes.data) {
    return { error: '房间不存在' }
  }

  const room = roomRes.data

  if (room.status === 'finished') {
    return {
      isWinner: room.winnerOpenid === openid,
      alreadyFinished: true
    }
  }

  if (room.status !== 'playing') {
    return { error: '对战未开始' }
  }

  if (!room.players || !room.players[openid]) {
    return { error: '你不在此房间中' }
  }

  const opponentOpenid =
    room.hostOpenid === openid ? room.guestOpenid : room.hostOpenid

  let winnerOpenid = null
  let winReason = null
  const now = Date.now()

  if (result === 'mine') {
    winnerOpenid = opponentOpenid
    winReason = 'opponent_mine'
  } else if (result === 'win') {
    const opponent = room.players[opponentOpenid]
    if (opponent && opponent.finished) {
      winnerOpenid =
        timeMs < opponent.finishTimeMs ? openid : opponentOpenid
      winReason = 'first_finish'
    } else {
      winnerOpenid = openid
      winReason = 'first_finish'
    }
  } else {
    return { error: '无效的结果' }
  }

  const updateData = {
    status: 'finished',
    winnerOpenid,
    winReason,
    [`players.${openid}.finished`]: true,
    [`players.${openid}.finishTimeMs`]: timeMs || null,
    [`players.${openid}.finishAt`]: now
  }

  if (result === 'win') {
    updateData[`players.${openid}.progress`] = 100
  }

  await db.collection('rooms').doc(roomId).update({ data: updateData })

  return {
    isWinner: winnerOpenid === openid,
    winnerOpenid,
    winReason
  }
}
