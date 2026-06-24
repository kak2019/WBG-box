const { callFunction, db } = require('./cloud')

function createRoom(gameType, options = {}) {
  return callFunction('createRoom', {
    gameType,
    puzzleId: options.puzzleId || 'default',
    difficulty: options.difficulty || 'medium'
  })
}

function joinRoom(roomId) {
  return callFunction('joinRoom', { roomId })
}

function setReady(roomId) {
  return callFunction('updateRoom', { roomId, action: 'ready' })
}

function updateProgress(roomId, progress) {
  return callFunction('updateRoom', {
    roomId,
    action: 'progress',
    progress: Math.min(100, Math.max(0, Math.floor(progress)))
  })
}

function finishBattle(roomId, gameType, payload) {
  return callFunction('finishBattle', {
    roomId,
    gameType,
    ...payload
  })
}

function watchRoom(roomId, onChange, onError) {
  const watcher = db.collection('rooms').doc(roomId).watch({
    onChange(snapshot) {
      if (snapshot.docs && snapshot.docs.length > 0) {
        onChange(snapshot.docs[0])
      }
    },
    onError(err) {
      if (onError) onError(err)
      else console.error('watch room error', err)
    }
  })
  return watcher
}

function closeWatcher(watcher) {
  if (watcher && watcher.close) {
    watcher.close()
  }
}

module.exports = {
  createRoom,
  joinRoom,
  setReady,
  updateProgress,
  finishBattle,
  watchRoom,
  closeWatcher
}
