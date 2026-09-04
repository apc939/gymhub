import { describe, it, expect } from 'vitest'
import { generateQRCodeMatrix } from './qr.js'

describe('generateQRCodeMatrix', () => {
  it('generates a valid binary square matrix for an invitation URL', () => {
    const matrix = generateQRCodeMatrix('https://gymhub.app/#/login?code=MED-7492')
    expect(Array.isArray(matrix)).toBe(true)
    expect(matrix.length).toBeGreaterThanOrEqual(21)
    expect(matrix[0].length).toBe(matrix.length)
    // Finder patterns top-left must be 1
    expect(matrix[0][0]).toBe(1)
    expect(matrix[0][6]).toBe(1)
    expect(matrix[6][0]).toBe(1)
  })

  it('generates a matrix for short access codes', () => {
    const matrix = generateQRCodeMatrix('MED-1234')
    expect(matrix.length).toBe(21)
  })

  it('formats medical QR invite link correctly with query parameter', () => {
    const code = 'MED-9999'
    const link = `https://gymhub.app/#/login?code=${encodeURIComponent(code)}`
    const url = new URL(link.replace('/#', ''))
    expect(url.searchParams.get('code')).toBe('MED-9999')
    const matrix = generateQRCodeMatrix(link)
    expect(matrix.length).toBeGreaterThanOrEqual(25)
  })
})
