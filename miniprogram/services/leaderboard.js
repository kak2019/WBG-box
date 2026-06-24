const { callFunction, db } = require('./cloud')

function submitNonogramTime(puzzleId, timeMs) {
  return callFunction('submitScore', {
    gameType: 'nonogram',
    scoreType: 'time',
    puzzleId,
    timeMs
  })
}

function submitNonogramScore(puzzleId, score) {
  return callFunction('submitScore', {
    gameType: 'nonogram',
    scoreType: 'score',
    puzzleId,
    score
  })
}

function submitMinesweeperScore(difficulty, score, timeMs) {
  return callFunction('submitScore', {
    gameType: 'minesweeper',
    scoreType: 'score',
    puzzleId: difficulty,
    score,
    timeMs
  })
}

function getLeaderboard(gameType, scoreType, puzzleId, limit = 100) {
  return callFunction('getLeaderboard', {
    gameType,
    scoreType,
    puzzleId,
    limit
  })
}

function getMyRank(gameType, scoreType, puzzleId) {
  return callFunction('getLeaderboard', {
    gameType,
    scoreType,
    puzzleId,
    myRank: true
  })
}

module.exports = {
  submitNonogramTime,
  submitNonogramScore,
  submitMinesweeperScore,
  getLeaderboard,
  getMyRank,
  db
}
