const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const COLLECTION_MAP = {
  'nonogram_time': 'leaderboard_nonogram_time',
  'nonogram_score': 'leaderboard_nonogram_score',
  'minesweeper_score': 'leaderboard_minesweeper_score'
}

function getCollectionKey(gameType, scoreType) {
  return `${gameType}_${scoreType}`
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { gameType, scoreType, puzzleId, score, timeMs } = event

  const key = getCollectionKey(gameType, scoreType)
  const collectionName = COLLECTION_MAP[key]
  if (!collectionName) {
    return { error: '无效的排行榜类型' }
  }

  if (scoreType === 'time' && (!timeMs || timeMs < 1000)) {
    return { error: '无效的时间记录' }
  }
  if (scoreType === 'score' && (!score || score <= 0)) {
    return { error: '无效的分数' }
  }

  const collection = db.collection(collectionName)
  const existing = await collection
    .where({ _openid: openid, puzzleId: puzzleId || 'default' })
    .limit(1)
    .get()

  const record = {
    puzzleId: puzzleId || 'default',
    nickname: event.nickname || '玩家',
    avatarUrl: event.avatarUrl || '',
    updatedAt: db.serverDate()
  }

  if (scoreType === 'time') {
    record.timeMs = timeMs
  } else {
    record.score = score
    if (timeMs) record.timeMs = timeMs
  }

  if (existing.data.length === 0) {
    await collection.add({ data: record })
    return { success: true, action: 'created' }
  }

  const old = existing.data[0]
  let shouldUpdate = false

  if (scoreType === 'time') {
    shouldUpdate = timeMs < old.timeMs
  } else {
    shouldUpdate = score > (old.score || 0)
  }

  if (shouldUpdate) {
    await collection.doc(old._id).update({ data: record })
    return { success: true, action: 'updated' }
  }

  return { success: true, action: 'ignored' }
}
