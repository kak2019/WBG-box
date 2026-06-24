/**
 * 塞车场（Rush Hour）游戏引擎
 * 6×6 网格，滑动车辆让红色主车从右侧出口离开
 */

const BOARD_ROWS = 6
const BOARD_COLS = 6
const EXIT_ROW = 2

const CAR_COLORS = {
  main: '#e94560',
  c1: '#3498db',
  c2: '#f39c12',
  c3: '#2ecc71',
  c4: '#9b59b6',
  c5: '#1abc9c',
  c6: '#e67e22',
  c7: '#34495e',
  c8: '#95a5a6',
  c9: '#d35400',
  c10: '#16a085'
}

function cloneCars(cars) {
  return cars.map(c => ({ ...c }))
}

function getCarAt(cars, row, col) {
  for (const car of cars) {
    if (car.orientation === 'h') {
      if (row === car.row && col >= car.col && col < car.col + car.length) return car
    } else {
      if (col === car.col && row >= car.row && row < car.row + car.length) return car
    }
  }
  return null
}

function cellsOccupiedBy(cars, excludeId) {
  const set = new Set()
  for (const car of cars) {
    if (car.id === excludeId) continue
    for (let i = 0; i < car.length; i++) {
      if (car.orientation === 'h') {
        set.add(`${car.row},${car.col + i}`)
      } else {
        set.add(`${car.row + i},${car.col}`)
      }
    }
  }
  return set
}

function isWin(cars) {
  const main = cars.find(c => c.isMain)
  if (!main) return false
  return main.col + main.length > BOARD_COLS - 1
}

function maxSlideSteps(cars, carId, direction) {
  const car = cars.find(c => c.id === carId)
  if (!car) return 0

  const occupied = cellsOccupiedBy(cars, carId)
  let steps = 0

  if (car.orientation === 'h') {
    if (direction > 0) {
      while (true) {
        const frontCol = car.col + car.length + steps
        if (frontCol >= BOARD_COLS) {
          if (car.isMain && car.row === EXIT_ROW) steps++
          break
        }
        if (occupied.has(`${car.row},${frontCol}`)) break
        steps++
      }
    } else {
      while (true) {
        const backCol = car.col - 1 - steps
        if (backCol < 0) break
        if (occupied.has(`${car.row},${backCol}`)) break
        steps++
      }
    }
  } else if (direction > 0) {
    while (true) {
      const frontRow = car.row + car.length + steps
      if (frontRow >= BOARD_ROWS) break
      if (occupied.has(`${frontRow},${car.col}`)) break
      steps++
    }
  } else {
    while (true) {
      const backRow = car.row - 1 - steps
      if (backRow < 0) break
      if (occupied.has(`${backRow},${car.col}`)) break
      steps++
    }
  }

  return steps
}

function slideCar(cars, carId, direction, distance) {
  if (distance <= 0) return null
  const next = cloneCars(cars)
  const car = next.find(c => c.id === carId)
  if (!car) return null

  if (car.orientation === 'h') {
    car.col += direction * distance
  } else {
    car.row += direction * distance
  }
  return next
}

function trySlide(cars, carId, direction, distance) {
  const maxSteps = maxSlideSteps(cars, carId, direction)
  const actual = Math.min(distance, maxSteps)
  if (actual <= 0) return { cars, moved: 0 }
  return { cars: slideCar(cars, carId, direction, actual), moved: actual }
}

function stateKey(cars) {
  return cars
    .map(c => `${c.id}@${c.row},${c.col}`)
    .sort()
    .join('|')
}

function getAllMoves(cars) {
  const moves = []
  for (const car of cars) {
    for (const dir of [-1, 1]) {
      const steps = maxSlideSteps(cars, car.id, dir)
      if (steps > 0) {
        moves.push({ carId: car.id, direction: dir, distance: steps })
      }
    }
  }
  return moves
}

function bfsSolve(initialCars, maxDepth = 120) {
  if (isWin(initialCars)) {
    return { solvable: true, minMoves: 0, path: [] }
  }

  const queue = [{ cars: cloneCars(initialCars), path: [] }]
  const visited = new Set([stateKey(initialCars)])

  while (queue.length > 0) {
    const { cars, path } = queue.shift()
    if (path.length >= maxDepth) continue

    for (const move of getAllMoves(cars)) {
      const next = slideCar(cars, move.carId, move.direction, move.distance)
      if (!next) continue

      const key = stateKey(next)
      if (visited.has(key)) continue
      visited.add(key)

      const newPath = path.concat([move])
      if (isWin(next)) {
        return { solvable: true, minMoves: newPath.length, path: newPath }
      }
      queue.push({ cars: next, path: newPath })
    }
  }

  return { solvable: false, minMoves: -1, path: [] }
}

function carsToRender(cars, cellSize) {
  return cars.map(car => {
    const color = car.isMain ? CAR_COLORS.main : CAR_COLORS[car.id] || '#888'
    const w = car.orientation === 'h' ? car.length * cellSize : cellSize
    const h = car.orientation === 'v' ? car.length * cellSize : cellSize
    return {
      ...car,
      color,
      style: `left:${car.col * cellSize}rpx;top:${car.row * cellSize}rpx;width:${w}rpx;height:${h}rpx;`
    }
  })
}

function computeScore(level, moves, timeMs) {
  const optimal = level.minMoves || 10
  const moveBonus = Math.max(0, (optimal + 5 - moves) * 20)
  const timeBonus = Math.max(0, 300 - Math.floor(timeMs / 1000)) * 2
  return Math.max(100, 500 + moveBonus + timeBonus - level.difficulty * 50)
}

const LEVELS = [
  {
    id: 'tutorial',
    name: '教程',
    difficulty: 1,
    minMoves: 2,
    cars: [
      { id: 'main', row: 2, col: 0, length: 2, orientation: 'h', isMain: true },
      { id: 'v1', row: 2, col: 2, length: 2, orientation: 'v', isMain: false }
    ]
  },
  {
    id: 'easy_01',
    name: '入门 1',
    difficulty: 1,
    minMoves: 5,
    cars: [
      { id: 'main', row: 2, col: 2, length: 2, orientation: 'h', isMain: true },
      { id: 'v1', row: 0, col: 2, length: 2, orientation: 'v', isMain: false },
      { id: 'c1', row: 0, col: 0, length: 2, orientation: 'v', isMain: false },
      { id: 'c2', row: 2, col: 0, length: 2, orientation: 'v', isMain: false },
      { id: 'c3', row: 0, col: 4, length: 2, orientation: 'v', isMain: false },
      { id: 'c4', row: 2, col: 4, length: 2, orientation: 'v', isMain: false },
      { id: 'c5', row: 2, col: 5, length: 2, orientation: 'v', isMain: false },
      { id: 'c6', row: 4, col: 5, length: 2, orientation: 'v', isMain: false },
      { id: 'c7', row: 1, col: 4, length: 2, orientation: 'h', isMain: false },
      { id: 'c8', row: 4, col: 2, length: 3, orientation: 'h', isMain: false }
    ]
  },
  {
    id: 'easy_02',
    name: '入门 2',
    difficulty: 2,
    minMoves: 5,
    cars: [
      { id: 'main', row: 2, col: 2, length: 2, orientation: 'h', isMain: true },
      { id: 'v1', row: 0, col: 2, length: 2, orientation: 'v', isMain: false },
      { id: 'c1', row: 0, col: 0, length: 2, orientation: 'v', isMain: false },
      { id: 'c2', row: 4, col: 0, length: 2, orientation: 'v', isMain: false },
      { id: 'c3', row: 0, col: 4, length: 2, orientation: 'v', isMain: false },
      { id: 'c4', row: 2, col: 4, length: 2, orientation: 'v', isMain: false },
      { id: 'c5', row: 2, col: 5, length: 2, orientation: 'v', isMain: false },
      { id: 'c6', row: 4, col: 5, length: 2, orientation: 'v', isMain: false },
      { id: 'c7', row: 1, col: 4, length: 2, orientation: 'h', isMain: false },
      { id: 'c8', row: 4, col: 2, length: 3, orientation: 'h', isMain: false }
    ]
  },
  {
    id: 'medium_01',
    name: '进阶',
    difficulty: 3,
    minMoves: 4,
    cars: [
      { id: 'main', row: 2, col: 2, length: 2, orientation: 'h', isMain: true },
      { id: 'v1', row: 0, col: 2, length: 2, orientation: 'v', isMain: false },
      { id: 'c1', row: 2, col: 0, length: 2, orientation: 'v', isMain: false },
      { id: 'c2', row: 4, col: 0, length: 2, orientation: 'v', isMain: false },
      { id: 'c3', row: 0, col: 4, length: 2, orientation: 'v', isMain: false },
      { id: 'c4', row: 2, col: 4, length: 2, orientation: 'v', isMain: false },
      { id: 'c5', row: 0, col: 5, length: 2, orientation: 'v', isMain: false },
      { id: 'c6', row: 2, col: 5, length: 2, orientation: 'v', isMain: false },
      { id: 'c7', row: 1, col: 3, length: 2, orientation: 'h', isMain: false },
      { id: 'c8', row: 4, col: 3, length: 3, orientation: 'h', isMain: false }
    ]
  },
  {
    id: 'hard_01',
    name: '挑战',
    difficulty: 4,
    minMoves: 6,
    cars: [
      { id: 'main', row: 2, col: 0, length: 2, orientation: 'h', isMain: true },
      { id: 'v1', row: 2, col: 2, length: 2, orientation: 'v', isMain: false },
      { id: 'c1', row: 0, col: 0, length: 2, orientation: 'v', isMain: false },
      { id: 'c2', row: 3, col: 0, length: 2, orientation: 'v', isMain: false },
      { id: 'c3', row: 0, col: 4, length: 2, orientation: 'v', isMain: false },
      { id: 'c4', row: 2, col: 4, length: 2, orientation: 'v', isMain: false },
      { id: 'c5', row: 2, col: 5, length: 2, orientation: 'v', isMain: false },
      { id: 'c6', row: 4, col: 5, length: 2, orientation: 'v', isMain: false },
      { id: 'c7', row: 1, col: 4, length: 2, orientation: 'h', isMain: false },
      { id: 'c8', row: 4, col: 2, length: 3, orientation: 'h', isMain: false }
    ]
  }
]

function getLevel(id) {
  return LEVELS.find(l => l.id === id) || LEVELS[0]
}

function listLevels() {
  return LEVELS.map(l => ({
    id: l.id,
    name: l.name,
    difficulty: l.difficulty,
    minMoves: l.minMoves
  }))
}

function initLevel(levelId) {
  const level = getLevel(levelId)
  return {
    level,
    cars: cloneCars(level.cars),
    moves: 0
  }
}

function getHint(cars, hintIndex) {
  const result = bfsSolve(cars)
  if (!result.solvable || result.path.length === 0) return null
  return result.path[hintIndex % result.path.length]
}

module.exports = {
  BOARD_ROWS,
  BOARD_COLS,
  EXIT_ROW,
  cloneCars,
  getCarAt,
  isWin,
  trySlide,
  maxSlideSteps,
  slideCar,
  bfsSolve,
  carsToRender,
  computeScore,
  getLevel,
  listLevels,
  initLevel,
  getHint,
  getAllMoves
}
