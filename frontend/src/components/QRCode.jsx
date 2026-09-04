import { useMemo } from 'react'
import { generateQRCodeMatrix } from '../lib/qr.js'

export default function QRCode({ text, size = 200, bg = '#ffffff', fg = '#000000' }) {
  const matrix = useMemo(() => {
    try {
      return generateQRCodeMatrix(text)
    } catch (e) {
      console.error('Error generating QR:', e)
      return null
    }
  }, [text])

  if (!matrix) return null
  const count = matrix.length
  const cellSize = size / (count + 4) // with 2-module quiet zone
  const offset = cellSize * 2

  const rects = []
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (matrix[r][c] === 1) {
        rects.push(
          <rect
            key={`${r}-${c}`}
            x={offset + c * cellSize}
            y={offset + r * cellSize}
            width={cellSize + 0.3} // slight overlap to prevent SVG sub-pixel gaps
            height={cellSize + 0.3}
            fill={fg}
          />
        )
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ borderRadius: 12, background: bg, padding: 6, display: 'inline-block', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
    >
      <rect width={size} height={size} fill={bg} rx={12} />
      {rects}
    </svg>
  )
}
