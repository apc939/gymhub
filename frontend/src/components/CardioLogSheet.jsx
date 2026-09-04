import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { todayISO } from '../lib/format.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export default function CardioLogSheet({ close, prescription }) {
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)

  const defaultType = prescription?.type || 'Caminata'
  const defaultMinutes = prescription?.targetMinutes || 30

  const [type, setType] = useState(defaultType)
  const [minutes, setMinutes] = useState(defaultMinutes)
  const [effort, setEffort] = useState('good') // 'easy' | 'good' | 'hard'
  const [hasPain, setHasPain] = useState(false)
  const [painArea, setPainArea] = useState('')

  const handleSave = () => {
    const minNum = Math.max(1, Number(minutes) || 15)
    const log = {
      id: 'c_' + Date.now(),
      type,
      minutes: minNum,
      effort,
      pain: hasPain,
      painArea: hasPain ? (painArea || 'Zona articular') : null,
      date: todayISO(),
      ts: Date.now()
    }

    update(s => {
      s.cardioLogs = s.cardioLogs || []
      s.cardioLogs.push(log)
    })

    toast(`¡Excelente trabajo! ${minNum} min de ${type} registrados.`)
    close()
  }

  const PAIN_AREAS = ['Rodilla', 'Zona Lumbar', 'Tobillo', 'Cadera', 'Hombro', 'Otra']

  return (
    <div style={{ textAlign: 'left', padding: '6px 0' }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>Registrar Cardio Realizado</h3>
          <div className="dim small" style={{ marginTop: 2 }}>
            Reporte rápido de tu sesión aeróbica (menos de 10 segundos).
          </div>
        </div>
      </div>

      {/* Tipo de ejercicio */}
      <label className="small muted" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
        Actividad Realizada:
      </label>
      <div className="chips" style={{ marginBottom: 16 }}>
        {['Caminata', 'Bicicleta', 'Elíptica', 'Natación', 'Trote Suave'].map(t => (
          <button
            key={t}
            type="button"
            className={'chip' + (type.toLowerCase() === t.toLowerCase() ? ' on' : '')}
            onClick={() => setType(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Duración en minutos */}
      <label className="small muted" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
        Tiempo completado (minutos):
      </label>
      <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 18 }}>
        <button
          className="btn"
          style={{ width: 44, height: 44, fontSize: 18, fontWeight: 700 }}
          onClick={() => setMinutes(m => Math.max(5, (Number(m) || 30) - 5))}
        >
          -5
        </button>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="number"
            className="input"
            value={minutes}
            min={1}
            max={300}
            onChange={e => setMinutes(e.target.value)}
            style={{ textAlign: 'center', fontSize: 24, fontWeight: 800, letterSpacing: '.04em' }}
          />
          <span className="dim small" style={{ position: 'absolute', right: 14, top: 14 }}>min</span>
        </div>
        <button
          className="btn"
          style={{ width: 44, height: 44, fontSize: 18, fontWeight: 700 }}
          onClick={() => setMinutes(m => (Number(m) || 30) + 5)}
        >
          +5
        </button>
      </div>

      {/* Sensación de esfuerzo */}
      <label className="small muted" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
        ¿Cómo sentiste el esfuerzo?
      </label>
      <div className="row" style={{ gap: 8, marginBottom: 18 }}>
        <button
          type="button"
          className="btn"
          style={{
            flex: 1, padding: '10px 4px', fontSize: 12, fontWeight: 600,
            border: effort === 'easy' ? '2px solid var(--green)' : '1px solid var(--sep)',
            background: effort === 'easy' ? 'color-mix(in srgb, var(--green) 14%, transparent)' : 'var(--surface-2)'
          }}
          onClick={() => setEffort('easy')}
        >
          <div style={{ fontSize: 18, marginBottom: 2 }}>😊</div>
          Fácil / Ligero
        </button>
        <button
          type="button"
          className="btn"
          style={{
            flex: 1, padding: '10px 4px', fontSize: 12, fontWeight: 600,
            border: effort === 'good' ? '2px solid var(--acc)' : '1px solid var(--sep)',
            background: effort === 'good' ? 'color-mix(in srgb, var(--acc) 14%, transparent)' : 'var(--surface-2)'
          }}
          onClick={() => setEffort('good')}
        >
          <div style={{ fontSize: 18, marginBottom: 2 }}>👍</div>
          Adecuado / Bien
        </button>
        <button
          type="button"
          className="btn"
          style={{
            flex: 1, padding: '10px 4px', fontSize: 12, fontWeight: 600,
            border: effort === 'hard' ? '2px solid var(--orange)' : '1px solid var(--sep)',
            background: effort === 'hard' ? 'color-mix(in srgb, var(--orange) 14%, transparent)' : 'var(--surface-2)'
          }}
          onClick={() => setEffort('hard')}
        >
          <div style={{ fontSize: 18, marginBottom: 2 }}>🥵</div>
          Muy exigente
        </button>
      </div>

      {/* Molestia o dolor articular */}
      <label className="small muted" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
        ¿Hubo alguna molestia o dolor durante la sesión?
      </label>
      <div className="row" style={{ gap: 8, marginBottom: hasPain ? 10 : 20 }}>
        <button
          type="button"
          className="btn"
          style={{
            flex: 1, padding: '10px', fontSize: 13, fontWeight: 600,
            border: !hasPain ? '2px solid var(--green)' : '1px solid var(--sep)',
            background: !hasPain ? 'color-mix(in srgb, var(--green) 14%, transparent)' : 'var(--surface-2)'
          }}
          onClick={() => { setHasPain(false); setPainArea('') }}
        >
          🟢 Cero dolor
        </button>
        <button
          type="button"
          className="btn"
          style={{
            flex: 1, padding: '10px', fontSize: 13, fontWeight: 600,
            border: hasPain ? '2px solid var(--red)' : '1px solid var(--sep)',
            background: hasPain ? 'color-mix(in srgb, var(--red) 14%, transparent)' : 'var(--surface-2)',
            color: hasPain ? 'var(--red)' : 'inherit'
          }}
          onClick={() => setHasPain(true)}
        >
          ⚠️ Sentí molestia
        </button>
      </div>

      {hasPain && (
        <div style={{ marginBottom: 18, padding: 10, background: 'var(--surface-2)', borderRadius: 'var(--r-card)' }}>
          <div className="small muted" style={{ marginBottom: 6 }}>Selecciona la zona de la molestia:</div>
          <div className="chips">
            {PAIN_AREAS.map(a => (
              <button
                key={a}
                type="button"
                className={'chip' + (painArea === a ? ' on' : '')}
                onClick={() => setPainArea(a)}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button variant="primary" onClick={handleSave} style={{ width: '100%', height: 48, fontSize: 16 }}>
        Guardar Registro
      </Button>
    </div>
  )
}
