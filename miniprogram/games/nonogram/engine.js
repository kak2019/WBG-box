/**
 * 数织游戏引擎
 * 谜题格式: { id, rows, cols, rowClues, colClues, solution }
 * solution: 二维 0/1 数组，1 表示填色
 */

function createCellStates(rows, cols) {
  const cells = []
  for (let i = 0; i < rows * cols; i++) {
    cells.push(0) // 0=空, 1=填, 2=标记X
  }
  return cells
}

function getCell(cells, cols, row, col) {
  return cells[row * cols + col]
}

function setCell(cells, cols, row, col, state) {
  cells[row * cols + col] = state
  return cells
}

function cycleCellState(current) {
  return (current + 1) % 3
}

function computeLineClues(line) {
  const clues = []
  let count = 0
  for (let i = 0; i < line.length; i++) {
    if (line[i] === 1) {
      count++
    } else if (count > 0) {
      clues.push(count)
      count = 0
    }
  }
  if (count > 0) clues.push(count)
  if (clues.length === 0) clues.push(0)
  return clues
}

function cluesMatch(actual, expected) {
  const a = actual.length === 1 && actual[0] === 0 ? [] : actual
  const e = expected.length === 1 && expected[0] === 0 ? [] : expected
  if (a.length !== e.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== e[i]) return false
  }
  return true
}

function getRowStates(cells, rows, cols, row) {
  const line = []
  for (let c = 0; c < cols; c++) {
    const s = getCell(cells, cols, row, c)
    line.push(s === 1 ? 1 : 0)
  }
  return line
}

function getColStates(cells, rows, cols, col) {
  const line = []
  for (let r = 0; r < rows; r++) {
    const s = getCell(cells, cols, r, col)
    line.push(s === 1 ? 1 : 0)
  }
  return line
}

function checkWin(cells, puzzle) {
  const { rows, cols, rowClues, colClues, solution } = puzzle
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const expected = solution[r][c]
      const actual = getCell(cells, cols, r, c)
      if (expected === 1 && actual !== 1) return false
      if (expected === 0 && actual === 1) return false
    }
  }
  return true
}

function computeProgress(cells, puzzle) {
  const { rows, cols, solution } = puzzle
  let total = 0
  let correct = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (solution[r][c] === 1) {
        total++
        if (getCell(cells, cols, r, c) === 1) correct++
      }
    }
  }
  if (total === 0) return 100
  return Math.floor((correct / total) * 100)
}

function computeScore(puzzle, timeMs, mistakes) {
  const base = puzzle.rows * puzzle.cols * 10
  const timePenalty = Math.floor(timeMs / 1000)
  const mistakePenalty = (mistakes || 0) * 50
  return Math.max(100, base - timePenalty - mistakePenalty)
}

function solutionHash(puzzle) {
  const flat = puzzle.solution.map(row => row.join('')).join('')
  let hash = 0
  for (let i = 0; i < flat.length; i++) {
    hash = ((hash << 5) - hash + flat.charCodeAt(i)) | 0
  }
  return hash.toString(16)
}

// 内置关卡
const PUZZLES = {
  easy_01: {
    id: 'easy_01',
    name: '入门 5×5',
    rows: 5,
    cols: 5,
    rowClues: [[1], [3], [5], [3], [1]],
    colClues: [[1], [3], [5], [3], [1]],
    solution: [
      [0, 1, 0, 1, 0],
      [1, 1, 1, 0, 0],
      [1, 1, 1, 1, 1],
      [0, 0, 1, 1, 1],
      [0, 1, 0, 1, 0]
    ]
  },
  medium_01: {
    id: 'medium_01',
    name: '进阶 10×10',
    rows: 10,
    cols: 10,
    rowClues: [[2, 1], [1, 1, 1], [4], [2, 2], [1, 1], [2, 2], [4], [1, 1, 1], [1, 2], [3]],
    colClues: [[1, 1], [2, 2], [1, 1], [8], [1, 1], [4, 2], [1, 1], [2, 1], [2, 2], [1, 1]],
    solution: [
      [0, 1, 1, 0, 0, 1, 0, 0, 0, 0],
      [1, 0, 0, 1, 0, 1, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
      [0, 1, 1, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      [0, 1, 1, 0, 0, 1, 1, 0, 0, 0],
      [0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
      [1, 0, 0, 1, 0, 1, 0, 0, 0, 0],
      [0, 0, 1, 0, 1, 1, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 0, 0, 0, 0, 0]
    ]
  },
  daily: {
    id: 'daily',
    name: '每日挑战 8×8',
    rows: 8,
    cols: 8,
    rowClues: [[3], [1, 1], [5], [1, 1], [3], [1, 1], [5], [3]],
    colClues: [[3], [1, 1], [5], [1, 1], [3], [1, 1], [5], [3]],
    solution: [
      [0, 1, 1, 1, 0, 0, 0, 0],
      [1, 0, 0, 0, 1, 0, 0, 0],
      [1, 1, 1, 1, 1, 0, 0, 0],
      [1, 0, 0, 0, 1, 0, 0, 0],
      [0, 1, 1, 1, 0, 0, 0, 0],
      [1, 0, 0, 0, 1, 0, 0, 0],
      [1, 1, 1, 1, 1, 0, 0, 0],
      [0, 1, 1, 1, 0, 0, 0, 0]
    ]
  }
}

function getPuzzle(id) {
  return PUZZLES[id] || PUZZLES.easy_01
}

function listPuzzles() {
  return Object.values(PUZZLES)
}

module.exports = {
  createCellStates,
  getCell,
  setCell,
  cycleCellState,
  checkWin,
  computeProgress,
  computeScore,
  solutionHash,
  getPuzzle,
  listPuzzles,
  PUZZLES
}
