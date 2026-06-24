const COLORS = {
  bg: '#c0c0c0',
  hidden: '#bdbdbd',
  hiddenBorder: '#ffffff #7b7b7b #7b7b7b #ffffff',
  revealed: '#dcdcdc',
  mine: '#ff4444',
  flag: '#ff6600',
  numbers: ['', '#0000ff', '#008200', '#ff0000', '#000084', '#840000', '#008284', '#840084', '#808080']
}

function drawBoard(ctx, board, rows, cols, cellSize, offsetX, offsetY) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      const cell = board[i]
      const x = offsetX + c * cellSize
      const y = offsetY + r * cellSize

      if (cell.state === 'hidden' || cell.state === 'flagged') {
        ctx.fillStyle = COLORS.hidden
        ctx.fillRect(x, y, cellSize, cellSize)
        ctx.strokeStyle = '#888'
        ctx.lineWidth = 1
        ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1)
        if (cell.state === 'flagged') {
          ctx.fillStyle = COLORS.flag
          ctx.font = `${Math.floor(cellSize * 0.6)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('🚩', x + cellSize / 2, y + cellSize / 2)
        }
      } else {
        ctx.fillStyle = COLORS.revealed
        ctx.fillRect(x, y, cellSize, cellSize)
        ctx.strokeStyle = '#aaa'
        ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1)
        if (cell.isMine) {
          ctx.fillStyle = COLORS.mine
          ctx.beginPath()
          ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.25, 0, Math.PI * 2)
          ctx.fill()
        } else if (cell.adjacent > 0) {
          ctx.fillStyle = COLORS.numbers[cell.adjacent] || '#000'
          ctx.font = `bold ${Math.floor(cellSize * 0.55)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(cell.adjacent), x + cellSize / 2, y + cellSize / 2)
        }
      }
    }
  }
}

function hitTest(touchX, touchY, rows, cols, cellSize, offsetX, offsetY) {
  const col = Math.floor((touchX - offsetX) / cellSize)
  const row = Math.floor((touchY - offsetY) / cellSize)
  if (row < 0 || row >= rows || col < 0 || col >= cols) return null
  return { row, col }
}

function calcLayout(canvasWidth, canvasHeight, rows, cols, padding = 8) {
  const maxW = canvasWidth - padding * 2
  const maxH = canvasHeight - padding * 2
  const cellSize = Math.floor(Math.min(maxW / cols, maxH / rows))
  const boardW = cellSize * cols
  const boardH = cellSize * rows
  const offsetX = Math.floor((canvasWidth - boardW) / 2)
  const offsetY = Math.floor((canvasHeight - boardH) / 2)
  return { cellSize, offsetX, offsetY, boardW, boardH }
}

module.exports = {
  drawBoard,
  hitTest,
  calcLayout
}
