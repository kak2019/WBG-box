const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { roomId, action, progress } = event

  if (!roomId) {
    return { error: '缺少房间 ID' }
  }

  const roomRes = await db.collection('rooms').doc(roomId).get()
  if (!roomRes.data) {
    return { error: '房间不存在' }
  }

  const room = roomRes.data

  if (!room.players || !room.players[openid]) {
    return { error: '你不在此房间中' }
  }

  const players = { ...room.players }

  if (action === 'ready') {
    players[openid] = { ...players[openid], ready: true }

    const allReady =
      room.hostOpenid &&
      room.guestOpenid &&
      players[room.hostOpenid]?.ready &&
      players[room.guestOpenid]?.ready

    const updateData = { players }

    if (allReady && room.status !== 'playing') {
      updateData.status = 'playing'
      updateData.startedAt = Date.now()
    } else if (room.status === 'waiting' && room.guestOpenid) {
      updateData.status = 'ready'
    }

    await db.collection('rooms').doc(roomId).update({ data: updateData })

    return { success: true, started: !!allReady }
  }

  if (action === 'progress') {
    if (room.status !== 'playing') {
      return { error: '对战未开始' }
    }

    await db.collection('rooms').doc(roomId).update({
      data: {
        [`players.${openid}.progress`]: progress
      }
    })

    return { success: true }
  }

  return { error: '无效操作' }
}
