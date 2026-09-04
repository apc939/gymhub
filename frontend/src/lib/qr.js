// Minimal, zero-dependency QR Code generator (Byte Mode, ISO/IEC 18004)
// Generates an SVG path from any text string (URLs, codes) completely offline.

// Polynomial Galois Field GF(256) tables
const GF256 = new Uint8Array(512)
const LOG = new Uint8Array(256)
for (let i = 0, x = 1; i < 255; i++) {
  GF256[i] = x
  GF256[i + 255] = x
  LOG[x] = i
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0)
}

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0
  return GF256[LOG[x] + LOG[y]]
}

function polyMul(p1, p2) {
  const res = new Uint8Array(p1.length + p2.length - 1)
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      res[i + j] ^= gfMul(p1[i], p2[j])
    }
  }
  return res
}

function rsGenPoly(n) {
  let g = new Uint8Array([1])
  for (let i = 0; i < n; i++) {
    g = polyMul(g, new Uint8Array([1, GF256[i]]))
  }
  return g
}

function rsEncode(data, ecLen) {
  const gen = rsGenPoly(ecLen)
  const res = new Uint8Array(ecLen)
  for (let i = 0; i < data.length; i++) {
    const coef = data[i] ^ res[0]
    res.copyWithin(0, 1)
    res[ecLen - 1] = 0
    for (let j = 0; j < ecLen; j++) {
      res[j] ^= gfMul(gen[j + 1], coef)
    }
  }
  return res
}

// Version table: [version, totalBytes, ecBytes, size] (ECC Level M)
const VERSIONS = [
  { ver: 1, total: 26, data: 16, ec: 10, size: 21 },
  { ver: 2, total: 44, data: 28, ec: 16, size: 25 },
  { ver: 3, total: 70, data: 44, ec: 26, size: 29 },
  { ver: 4, total: 100, data: 64, ec: 36, size: 33 },
  { ver: 5, total: 134, data: 86, ec: 48, size: 37 }
]

export function generateQRCodeMatrix(text) {
  const rawBytes = new TextEncoder().encode(text)
  let v = VERSIONS.find(v => v.data - 3 >= rawBytes.length)
  if (!v) v = VERSIONS[VERSIONS.length - 1]

  // Header: Byte Mode (0100) + Length (8 bits for Ver 1-9)
  const bits = [0, 1, 0, 0]
  for (let i = 7; i >= 0; i--) bits.push((rawBytes.length >> i) & 1)
  for (let b of rawBytes) {
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1)
  }
  // Terminator
  while (bits.length < v.data * 8 && bits.length % 8 !== 0) bits.push(0)
  while (bits.length < v.data * 8) {
    bits.push(0, 0, 0, 0)
    break
  }
  const dataBytes = new Uint8Array(v.data)
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i + j] || 0)
    dataBytes[i >> 3] = byte
  }
  // Padding bytes
  const pad = [0xec, 0x11]
  let padIdx = 0
  for (let i = (bits.length + 7) >> 3; i < v.data; i++) {
    dataBytes[i] = pad[padIdx % 2]
    padIdx++
  }

  const ecBytes = rsEncode(dataBytes, v.ec)
  const allCodewords = new Uint8Array(v.total)
  allCodewords.set(dataBytes, 0)
  allCodewords.set(ecBytes, v.data)

  const S = v.size
  const grid = Array.from({ length: S }, () => Array(S).fill(null))
  const isFunc = Array.from({ length: S }, () => Array(S).fill(false))

  function setFinder(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r, nc = col + c
        if (nr < 0 || nr >= S || nc < 0 || nc >= S) continue
        isFunc[nr][nc] = true
        if (r === -1 || r === 7 || c === -1 || c === 7) grid[nr][nc] = 0
        else if (r === 0 || r === 6 || c === 0 || c === 6) grid[nr][nc] = 1
        else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) grid[nr][nc] = 1
        else grid[nr][nc] = 0
      }
    }
  }

  setFinder(0, 0)
  setFinder(0, S - 7)
  setFinder(S - 7, 0)

  // Timing patterns
  for (let i = 8; i < S - 8; i++) {
    isFunc[6][i] = true
    grid[6][i] = i % 2 === 0 ? 1 : 0
    isFunc[i][6] = true
    grid[i][6] = i % 2 === 0 ? 1 : 0
  }

  // Alignment pattern for version >= 2
  if (v.ver >= 2) {
    const pos = S - 7
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const nr = pos + r, nc = pos + c
        if (!isFunc[nr][nc]) {
          isFunc[nr][nc] = true
          grid[nr][nc] = (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) ? 1 : 0
        }
      }
    }
  }

  // Dark module
  isFunc[4 * v.ver + 9][8] = true
  grid[4 * v.ver + 9][8] = 1

  // Format info space
  for (let i = 0; i < 9; i++) {
    if (!isFunc[8][i]) { isFunc[8][i] = true; grid[8][i] = 0 }
    if (!isFunc[i][8]) { isFunc[i][8] = true; grid[i][8] = 0 }
    if (!isFunc[8][S - 1 - i]) { isFunc[8][S - 1 - i] = true; grid[8][S - 1 - i] = 0 }
    if (!isFunc[S - 1 - i][8]) { isFunc[S - 1 - i][8] = true; grid[S - 1 - i][8] = 0 }
  }

  // Write data bits into grid (zigzag upward and downward)
  const bitStream = []
  for (let byte of allCodewords) {
    for (let i = 7; i >= 0; i--) bitStream.push((byte >> i) & 1)
  }

  let bitIdx = 0
  let upward = true
  for (let right = S - 1; right > 0; right -= 2) {
    if (right === 6) right--
    const cols = [right, right - 1]
    const rows = upward
      ? Array.from({ length: S }, (_, i) => S - 1 - i)
      : Array.from({ length: S }, (_, i) => i)

    for (let r of rows) {
      for (let c of cols) {
        if (!isFunc[r][c]) {
          const bit = bitIdx < bitStream.length ? bitStream[bitIdx++] : 0
          // Apply standard mask (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0 ? 1 : 0
          grid[r][c] = bit ^ mask
        }
      }
    }
    upward = !upward
  }

  // Format bits for ECC Level M, Mask 0 (0x5412 XOR 0x5412 = 0, standard 15-bit format)
  // Mask 000, ECC M: bits = 101010000010010
  const fmtBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0]
  const fmtCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ]
  const fmtCoords2 = [
    [S - 1, 8], [S - 2, 8], [S - 3, 8], [S - 4, 8], [S - 5, 8], [S - 6, 8], [S - 7, 8],
    [8, S - 8], [8, S - 7], [8, S - 6], [8, S - 5], [8, S - 4], [8, S - 3], [8, S - 2], [8, S - 1]
  ]
  for (let i = 0; i < 15; i++) {
    const bit = fmtBits[i]
    grid[fmtCoords[i][0]][fmtCoords[i][1]] = bit
    grid[fmtCoords2[i][0]][fmtCoords2[i][1]] = bit
  }

  return grid
}
