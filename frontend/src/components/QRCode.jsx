import { useEffect, useState } from 'react'
import QRCodeLib from 'qrcode'
import { generateQRCodeMatrix } from '../lib/qr.js'

export default function QRCode({ text, size = 220, bg = '#ffffff', fg = '#000000' }) {
  const [svg, setSvg] = useState('')

  useEffect(() => {
    if (!text) return
    QRCodeLib.toString(text, {
      type: 'svg',
      width: size,
      margin: 4, // 4-module quiet zone required by ISO/IEC 18004 for phone cameras
      color: {
        dark: fg,
        light: bg
      },
      errorCorrectionLevel: 'M'
    })
      .then(setSvg)
      .catch(err => {
        console.error('Error generating QR with qrcode library:', err)
      })
  }, [text, size, bg, fg])

  if (!svg) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: bg,
          borderRadius: 8
        }}
      >
        <span className="dim small">Generando QR…</span>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'inline-block',
        background: bg,
        padding: 8,
        borderRadius: 8,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        lineHeight: 0
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
