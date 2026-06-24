const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { roomId } = event

  if (!roomId) {
    return { error: '缺少房间 ID' }
  }

  const roomRes = await db.collection('rooms').doc(roomId).get()
  if (!roomRes.data) {
    return { error: '房间不存在' }
  }

  const room = roomRes.data

  if (room.status === 'expired' || Date.now() > room.expiresAt) {
    await db.collection('rooms').doc(roomId).update({
      data: { status: 'expired' }
    })
    return { error: '房间已过期' }
  }

  if (room.status === 'finished') {
    return { error: '对战已结束' }
  }

  const isHost = room.hostOpenid === openid

  if (isHost) {
    return {
      roomId,
      isHost: true,
      gameType: room.gameType,
      myOpenid: openid
    }
  }

  if (room.guestOpenid && room.guestOpenid !== openid) {
    return { error: '房间已满' }
  }

  if (!room.guestOpenid) {
    const players = { ...room.players }
    players[openid] = {
      ready: false,
      progress: 0,
      finished: false,
      finishTimeMs: null,
      finishAt: null
    }

    await db.collection('rooms').doc(roomId).update({
      data: {
        guestOpenid: openid,
        players,
        status: 'ready'
      }
    })
  }

  return {
    roomId,
    isHost: false,
    gameType: room.gameType,
    myOpenid: openid
  }
}
