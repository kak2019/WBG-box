const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const COLLECTION_MAP = {
  'nonogram_time': 'leaderboard_nonogram_time',
  'nonogram_score': 'leaderboard_nonogram_score',
  'minesweeper_score': 'leaderboard_minesweeper_score'
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { gameType, scoreType, puzzleId, limit = 100, myRank } = event

  const key = `${gameType}_${scoreType}`
  const collectionName = COLLECTION_MAP[key]
  if (!collectionName) {
    return { error: '无效的排行榜类型' }
  }

  const collection = db.collection(collectionName)
  const query = { puzzleId: puzzleId || 'default' }

  const orderField = scoreType === 'time' ? 'timeMs' : 'score'
  const orderDir = scoreType === 'time' ? 'asc' : 'desc'

  const listRes = await collection
    .where(query)
    .orderBy(orderField, orderDir)
    .limit(Math.min(limit, 100))
    .get()

  const list = listRes.data

  let myRecord = null
  if (myRank) {
    const mine = await collection
      .where({ ...query, _openid: openid })
      .limit(1)
      .get()

    if (mine.data.length > 0) {
      const record = mine.data[0]
      const value = scoreType === 'time' ? record.timeMs : record.score

      let rankQuery
      if (scoreType === 'time') {
        rankQuery = collection.where({
          ...query,
          timeMs: _.lt(value)
        })
      } else {
        rankQuery = collection.where({
          ...query,
          score: _.gt(value)
        })
      }

      const betterCount = await rankQuery.count()
      myRecord = {
        ...record,
        rank: betterCount.total + 1
      }
    }
  }

  return { list, myRecord }
}
