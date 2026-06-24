/**
 * 扫雷游戏引擎 - 确定性随机（基于 seed）
 */

function hashSeed(seed) {
  let h = 2166136261
  const str = String(seed)
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function createRng(seed) {
  let state = hashSeed(seed)
  return function next() {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

const DIFFICULTIES = {
  easy: { rows: 9, cols: 9, mines: 10, label: '简单 9×9' },
  medium: { rows: 16, cols: 16, mines: 40, label: '中等 16×16' },
  hard: { rows: 16, cols: 30, mines: 99, label: '困难 16×30' }
}

function idx(row, col, cols) {
  return row * cols + col
}

function generateBoard(seed, difficulty) {
  const config = DIFFICULTIES[difficulty] || DIFFICULTIES.medium
  const { rows, cols, mines } = config
  const total = rows * cols
  const rng = createRng(seed)

  const mineSet = new Set()
  while (mineSet.size < mines) {
    mineSet.add(Math.floor(rng() * total))
  }

  const board = []
  for (let i = 0; i < total; i++) {
    board.push({
      isMine: mineSet.has(i),
      adjacent: 0,
      state: 'hidden' // hidden | revealed | flagged
    })
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = idx(r, c, cols)
      if (board[i].isMine) continue
      let count = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const nr = r + dr
          const nc = c + dc
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            if (board[idx(nr, nc, cols)].isMine) count++
          }
        }
      }
      board[i].adjacent = count
    }
  }

  return { board, rows, cols, mines, mineCount: mines, difficulty }
}

function getNeighbors(row, col, rows, cols) {
  const neighbors = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr
      const nc = col + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        neighbors.push({ row: nr, col: nc })
      }
    }
  }
  return neighbors
}

function revealCell(board, rows, cols, row, col) {
  const i = idx(row, col, cols)
  const cell = board[i]
  if (cell.state !== 'hidden') return { hitMine: false, changed: false }
  if (cell.isMine) {
    cell.state = 'revealed'
    return { hitMine: true, changed: true }
  }

  const queue = [{ row, col }]
  const visited = new Set()
  let changed = false

  while (queue.length > 0) {
    const { row: r, col: c } = queue.shift()
    const key = `${r},${c}`
    if (visited.has(key)) continue
    visited.add(key)

    const ci = idx(r, c, cols)
    const cur = board[ci]
    if (cur.state === 'flagged' || cur.state === 'revealed') continue
    cur.state = 'revealed'
    changed = true

    if (cur.adjacent === 0) {
      getNeighbors(r, c, rows, cols).forEach(n => {
        const ni = idx(n.row, n.col, cols)
        if (board[ni].state === 'hidden' && !board[ni].isMine) {
          queue.push(n)
        }
      })
    }
  }

  return { hitMine: false, changed }
}

function toggleFlag(board, rows, cols, row, col) {
  const i = idx(row, col, cols)
  const cell = board[i]
  if (cell.state === 'revealed') return false
  if (cell.state === 'flagged') {
    cell.state = 'hidden'
  } else {
    cell.state = 'flagged'
  }
  return true
}

function countFlags(board) {
  return board.filter(c => c.state === 'flagged').length
}

function computeProgress(board, rows, cols) {
  let safeTotal = 0
  let revealedSafe = 0
  for (let i = 0; i < board.length; i++) {
    if (!board[i].isMine) {
      safeTotal++
      if (board[i].state === 'revealed') revealedSafe++
    }
  }
  if (safeTotal === 0) return 100
  return Math.floor((revealedSafe / safeTotal) * 100)
}

function checkWin(board) {
  return board.every(c => c.isMine || c.state === 'revealed')
}

function computeScore(difficulty, timeMs, won) {
  if (!won) return 0
  const mult = { easy: 1, medium: 2, hard: 4 }[difficulty] || 1
  const base = 1000 * mult
  const timeBonus = Math.max(0, 600 - Math.floor(timeMs / 1000)) * mult
  return base + timeBonus
}

function revealAllMines(board) {
  board.forEach(c => {
    if (c.isMine) c.state = 'revealed'
  })
}

module.exports = {
  DIFFICULTIES,
  generateBoard,
  revealCell,
  toggleFlag,
  countFlags,
  computeProgress,
  checkWin,
  computeScore,
  revealAllMines,
  idx
}
