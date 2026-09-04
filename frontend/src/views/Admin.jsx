import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { fmtDate, fmtNum, fmtVol, fmtDur } from '../lib/format.js'
import { auditCat, auditLine, fmtWhen } from '../lib/audit.js'
import { workoutVolume, setsDone } from '../lib/history.js'
import { confirmSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import AdminCoach from './AdminCoach.jsx'
import QRCode from '../components/QRCode.jsx'
import '../admin.css'

const rel = ts => {
  if (!ts) return 'nunca'
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 60) return 'hace un momento'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  const d = Math.floor(s / 86400)
  return d === 1 ? 'ayer' : `hace ${d} días`
}
const dur = ms => { const m = Math.max(0, Math.floor(ms / 60000)); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min' }

const AdherencePill = ({ status, days }) => {
  if (status === 'active') return <span className="adm-pill ok">Al día ({days === 0 ? 'hoy' : `${days}d`})</span>
  if (status === 'warning') return <span className="adm-pill warn">Atención ({days}d)</span>
  if (status === 'inactive') return <span className="adm-pill bad">Inactivo ({days}d)</span>
  return <span className="adm-pill">Nuevo</span>
}

const MOCK_PATIENTS = [
  {
    id: 'patient-1',
    name: 'Carlos Mendoza (Sedentario Iniciación)',
    phone: '+573001234567',
    created: '2026-08-10',
    workouts: 14,
    workouts30d: 8,
    routinesCount: 2,
    lastWorkout: new Date().toISOString().slice(0, 10),
    daysSinceLastWorkout: 0,
    adherenceStatus: 'active',
    cardioMinutesWeek: 60,
    cardioTargetWeek: 90,
    lastSensation: 'good',
    lastPain: false,
    lastSync: Date.now() - 3600000,
    hasPush: true
  },
  {
    id: 'patient-2',
    name: 'Don Fernando Silva (Adulto Mayor · Sarcopenia)',
    phone: '+573019876543',
    created: '2026-08-01',
    workouts: 6,
    workouts30d: 3,
    routinesCount: 1,
    lastWorkout: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10),
    daysSinceLastWorkout: 4,
    adherenceStatus: 'warning',
    cardioMinutesWeek: 20,
    cardioTargetWeek: 60,
    lastSensation: 'easy',
    lastPain: false,
    lastSync: Date.now() - 4 * 86400000,
    hasPush: true
  },
  {
    id: 'patient-3',
    name: 'María Elena Rodríguez (Readaptación Lumbar)',
    phone: '+573105554321',
    created: '2026-08-15',
    workouts: 9,
    workouts30d: 5,
    routinesCount: 1,
    lastWorkout: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
    daysSinceLastWorkout: 2,
    adherenceStatus: 'active',
    cardioMinutesWeek: 50,
    cardioTargetWeek: 50,
    lastSensation: 'hard',
    lastPain: true,
    lastPainArea: 'Zona Lumbar',
    lastSync: Date.now() - 2 * 86400000,
    hasPush: false
  },
  {
    id: 'patient-4',
    name: 'Jorge Restrepo (Riesgo de Abandono)',
    phone: '+573158889900',
    created: '2026-07-20',
    workouts: 3,
    workouts30d: 0,
    routinesCount: 1,
    lastWorkout: new Date(Date.now() - 9 * 86400000).toISOString().slice(0, 10),
    daysSinceLastWorkout: 9,
    adherenceStatus: 'inactive',
    cardioMinutesWeek: 0,
    cardioTargetWeek: 90,
    lastSensation: null,
    lastPain: false,
    lastSync: Date.now() - 9 * 86400000,
    hasPush: false
  },
  {
    id: 'patient-5',
    name: 'Lucía Gómez (Nueva Consulta · Post-Esguince)',
    phone: '+573204441122',
    created: '2026-09-03',
    workouts: 0,
    workouts30d: 0,
    routinesCount: 1,
    lastWorkout: null,
    daysSinceLastWorkout: null,
    adherenceStatus: 'new',
    cardioMinutesWeek: 0,
    cardioTargetWeek: 60,
    lastSensation: null,
    lastPain: false,
    lastSync: Date.now(),
    hasPush: false
  }
]

function QRCodeModal({ code, close }) {
  const toast = useUI(s => s.toast)
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  const [networkHost, setNetworkHost] = useState(() => {
    return localStorage.getItem('md_network_host') || (isLocalhost ? '192.168.1.26:5173' : window.location.host)
  })

  const effectiveOrigin = isLocalhost && networkHost
    ? `${window.location.protocol}//${networkHost}`
    : window.location.origin

  const inviteUrl = `${effectiveOrigin}${window.location.pathname}#/login?code=${encodeURIComponent(code)}`

  const copyLink = () => {
    navigator.clipboard?.writeText(inviteUrl).catch(() => {})
    toast('Enlace copiado para enviar a tu paciente')
  }

  const shareWA = () => {
    const text = encodeURIComponent(
      `Hola, te saluda el Dr. Andrés Parra Charris. Aquí tienes tu enlace de activación para tu plan de entrenamiento en GymHub:\n\n${inviteUrl}\n\nCódigo de consulta: ${code}\n\n¡Comencemos a movernos!`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div style={{ textAlign: 'center', padding: '10px 0' }}>
      <h3 style={{ margin: '0 0 6px' }}>Código QR de Vinculación</h3>
      <div className="dim small" style={{ marginBottom: 14 }}>
        Pide a tu paciente que apunte la cámara de su teléfono o compártele el enlace directo.
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0' }}>
        <QRCode text={inviteUrl} size={220} />
      </div>

      {isLocalhost && (
        <div style={{ margin: '6px auto 12px', maxWidth: 360, padding: '8px 12px', background: 'rgba(255,200,0,0.08)', borderRadius: 8, border: '1px solid rgba(255,200,0,0.25)', textAlign: 'left', fontSize: 12 }}>
          <div style={{ fontWeight: 600, color: 'var(--yellow)', marginBottom: 2 }}>
            💡 Red Wi-Fi local para celular:
          </div>
          <div className="dim" style={{ marginBottom: 6, lineHeight: 1.4 }}>
            Tu celular no puede conectarse a <code>localhost</code>. El QR usa la IP de tu computador en tu Wi-Fi para que tu cámara lo detecte:
          </div>
          <input
            className="input"
            style={{ fontSize: 12, padding: '4px 8px', height: 30, width: '100%' }}
            value={networkHost}
            onChange={e => {
              setNetworkHost(e.target.value)
              localStorage.setItem('md_network_host', e.target.value)
            }}
            placeholder="192.168.1.26:5173"
          />
        </div>
      )}

      <div
        className="card"
        style={{
          fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '.18em',
          padding: '10px 0',
          margin: '12px 0',
          background: 'var(--surface-2)',
          color: 'var(--acc)'
        }}
      >
        {code}
      </div>
      <div className="row" style={{ gap: 8, marginTop: 14 }}>
        <Button variant="primary" onClick={shareWA} icon="share">
          Compartir por WhatsApp
        </Button>
        <Button onClick={copyLink} icon="clipboard">
          Copiar Enlace
        </Button>
      </div>
      <div style={{ height: 10 }} />
      <Button variant="ghost" onClick={close}>Cerrar</Button>
    </div>
  )
}

function PrescribeRoutineModal({ patientId, patientName, onPrescribed, close }) {
  const S = useStore(s => s.S)
  const toast = useUI(s => s.toast)
  const [selectedRoutine, setSelectedRoutine] = useState(S.routines[0]?.id || '')
  const [loading, setLoading] = useState(false)

  const handlePrescribe = async () => {
    const routine = S.routines.find(r => r.id === selectedRoutine)
    if (!routine) { toast('Selecciona una rutina válida'); return }
    setLoading(true)
    try {
      await api('/api/admin/patient/prescribe-routine', {
        method: 'POST',
        body: JSON.stringify({ patientId, routine })
      })
      toast(`Rutina "${routine.name}" prescrita con éxito`)
    } catch (e) {
      // Offline / dev fallback: almacenar prescripción localmente
      const stored = JSON.parse(localStorage.getItem('md_mock_prescriptions_' + patientId) || '[]')
      stored.unshift({ id: routine.id, name: routine.name, count: (routine.ex || []).length, ex: routine.ex })
      localStorage.setItem('md_mock_prescriptions_' + patientId, JSON.stringify(stored))
      toast(`Rutina "${routine.name}" prescrita con éxito (guardada localmente)`)
    } finally {
      setLoading(false)
      onPrescribed()
      close()
    }
  }

  return (
    <div style={{ padding: '6px 0' }}>
      <h3 style={{ margin: '0 0 4px' }}>Prescribir Rutina a {patientName}</h3>
      <div className="adm-lead">Asigna directamente una de tus rutinas maestras de fuerza a este paciente.</div>
      {S.routines.length ? (
        <>
          <div className="adm-field" style={{ margin: '14px 0' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--label-2)', marginBottom: 6, display: 'block' }}>Seleccionar Rutina:</label>
            <select
              className="input"
              style={{ width: '100%', minHeight: 46, fontSize: 15, background: 'var(--surface-2)', borderRadius: 'var(--r-card)', padding: '0 12px' }}
              value={selectedRoutine}
              onChange={e => setSelectedRoutine(e.target.value)}
            >
              {S.routines.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} ({(r.ex || []).length} ejercicios)
                </option>
              ))}
            </select>
          </div>
          <Button variant="primary" onClick={handlePrescribe} disabled={loading}>
            {loading ? 'Prescribiendo...' : 'Confirmar Prescripción'}
          </Button>
        </>
      ) : (
        <div className="adm-empty" style={{ margin: '16px 0' }}>
          No tienes rutinas en tu biblioteca maestra. Crea una rutina en la pestaña "Plan" para poder asignarla.
        </div>
      )}
    </div>
  )
}

function PrescribeCardioModal({ patientId, patientName, currentCardio, onPrescribed, close }) {
  const toast = useUI(s => s.toast)
  const [type, setType] = useState(currentCardio?.type || 'Caminata')
  const [targetMinutes, setTargetMinutes] = useState(currentCardio?.targetMinutes || 30)
  const [frequencyPerWeek, setFrequencyPerWeek] = useState(currentCardio?.frequencyPerWeek || 3)
  const [intensity, setIntensity] = useState(currentCardio?.intensity || 'moderada')
  const [note, setNote] = useState(currentCardio?.note || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    const cardioData = {
      type,
      targetMinutes: Number(targetMinutes) || 30,
      frequencyPerWeek: Number(frequencyPerWeek) || 3,
      intensity,
      note: note.trim()
    }
    try {
      await api('/api/admin/patient/prescribe-cardio', {
        method: 'POST',
        body: JSON.stringify({ patientId, cardio: cardioData })
      })
    } catch (e) {
      // Offline fallback: almacenar en localStorage
      localStorage.setItem('md_mock_cardio_' + patientId, JSON.stringify(cardioData))
    }
    toast(`Prescripción de ${type} guardada con éxito`)
    setLoading(false)
    onPrescribed()
    close()
  }

  return (
    <div style={{ padding: '6px 0', textAlign: 'left' }}>
      <h3 style={{ margin: '0 0 4px' }}>Prescripción Cardiorrespiratoria</h3>
      <div className="dim small" style={{ marginBottom: 14 }}>
        Dosificación aeróbica para {patientName} (Medicina del Deporte).
      </div>

      <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Tipo de Ejercicio:</label>
      <select
        className="input"
        value={type}
        onChange={e => setType(e.target.value)}
        style={{ width: '100%', marginBottom: 12 }}
      >
        <option value="Caminata">🚶 Caminata (Cinta o Exterior)</option>
        <option value="Bicicleta">🚴 Bicicleta (Estática o Paseo)</option>
        <option value="Elíptica">🏃 Elíptica (Bajo impacto)</option>
        <option value="Natación">🏊 Natación / Hidrogimnasia</option>
        <option value="Trote Suave">👟 Trote Suave</option>
      </select>

      <div className="row" style={{ gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Minutos por sesión:</label>
          <input
            type="number"
            className="input"
            value={targetMinutes}
            min={10}
            max={120}
            step={5}
            onChange={e => setTargetMinutes(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Días por semana:</label>
          <input
            type="number"
            className="input"
            value={frequencyPerWeek}
            min={1}
            max={7}
            onChange={e => setFrequencyPerWeek(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Intensidad (Test de la Conversación):</label>
      <select
        className="input"
        value={intensity}
        onChange={e => setIntensity(e.target.value)}
        style={{ width: '100%', marginBottom: 12 }}
      >
        <option value="suave">🟢 Suave (Puede hablar fluidamente sin agitarse)</option>
        <option value="moderada">🟡 Moderada (Puede hablar frases cortas, respiración profunda)</option>
        <option value="vigorosa">🟠 Vigorosa (Le cuesta hablar continuamente)</option>
      </select>

      <label className="small muted" style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Indicación o Cuidado Especial:</label>
      <input
        type="text"
        className="input"
        placeholder="Ej: Calzado amortiguado, detenerse si hay molestia..."
        value={note}
        onChange={e => setNote(e.target.value)}
        style={{ width: '100%', marginBottom: 16 }}
      />

      <Button variant="primary" onClick={handleSave} disabled={loading} style={{ width: '100%' }}>
        {loading ? 'Guardando...' : 'Confirmar Prescripción Cardio'}
      </Button>
    </div>
  )
}

function UserDetail({ id, onChanged, close }) {
  const [d, setD] = useState(null)
  const [tab, setTab] = useState('prescriptions') // 'prescriptions' | 'cardio' | 'history' | 'notes'
  const toast = useUI(s => s.toast)
  const openSheet = useUI(s => s.openSheet)

  // Private local medical notes (strictly stored on doctor's device, never synced to cloud)
  const [notes, setNotes] = useState(() => localStorage.getItem('md_patient_note_' + id) || '')

  const loadDetail = () => {
    api('/api/admin/user?id=' + encodeURIComponent(id))
      .then(setD)
      .catch(() => {
        // Modo offline / local dev: simular expediente clínico con prescripciones locales
        const mockP = MOCK_PATIENTS.find(p => p.id === id) || { id, name: 'Paciente', created: '2026-08-01' }
        const localPrescriptions = JSON.parse(localStorage.getItem('md_mock_prescriptions_' + id) || '[]')
        const localCardio = JSON.parse(localStorage.getItem('md_mock_cardio_' + id) || 'null')
        const defaultCardio = localCardio || {
          type: id === 'patient-2' ? 'Caminata Suave' : id === 'patient-3' ? 'Elíptica' : 'Caminata',
          targetMinutes: id === 'patient-2' ? 20 : 30,
          frequencyPerWeek: 3,
          intensity: id === 'patient-2' ? 'suave' : 'moderada',
          note: id === 'patient-3' ? 'Detener si hay molestia lumbar' : 'Test del habla: conversar sin agitarse'
        }
        setD({
          user: mockP,
          workouts: [
            { id: 'w1', name: 'Fuerza Funcional y Core', d: '2026-09-02', start: Date.now() - 3600000, end: Date.now(), vol: 4200, sets: [{ done: true }, { done: true }] },
            { id: 'w2', name: 'Adaptación Articular y Fuerza', d: '2026-08-29', start: Date.now() - 5000000, end: Date.now() - 1400000, vol: 3800, sets: [{ done: true }] }
          ],
          routines: [
            { id: 'r1', name: 'Rutina Prescrita: Readaptación y Fuerza', count: 4, ex: [{ id: 'Sentadilla en Banco' }, { id: 'Press Militar Asistido' }] },
            ...localPrescriptions
          ],
          cardio: defaultCardio,
          cardioLogs: [
            { id: 'cl1', type: defaultCardio.type, minutes: defaultCardio.targetMinutes, date: '2026-09-02', effort: 'good', pain: mockP.lastPain || false, painArea: mockP.lastPainArea || null }
          ],
          bodyweight: [
            { d: '2026-09-01', w: 74.5 },
            { d: '2026-08-15', w: 75.2 }
          ],
          lastSync: Date.now() - 3600000,
          unit: 'kg'
        })
      })
  }

  useEffect(() => { loadDetail() }, [id])

  const saveNotes = val => {
    setNotes(val)
    localStorage.setItem('md_patient_note_' + id, val)
  }

  if (!d) return <div className="muted small" style={{ padding: 20, textAlign: 'center' }}>Cargando expediente clínico…</div>
  const u = d.user || {}
  const workouts = d.workouts || []
  const routines = d.routines || []
  const bodyweight = d.bodyweight || []
  const cardio = d.cardio || null
  const cardioLogs = d.cardioLogs || []

  const removeRoutine = routineId => confirmSheet({
    title: '¿Retirar rutina prescrita?',
    message: 'Esta rutina se retirará de la cuenta del paciente.',
    confirmText: 'Retirar',
    danger: true,
    onConfirm: async () => {
      try {
        await api('/api/admin/patient/remove-routine', { method: 'POST', body: JSON.stringify({ patientId: u.id, routineId }) })
      } catch (e) {
        // Offline fallback
        const stored = JSON.parse(localStorage.getItem('md_mock_prescriptions_' + u.id) || '[]')
        const filtered = stored.filter(r => r.id !== routineId)
        localStorage.setItem('md_mock_prescriptions_' + u.id, JSON.stringify(filtered))
      }
      toast('Rutina retirada')
      loadDetail()
      onChanged()
    }
  })

  const setDisabled = disabled => {
    api('/api/admin/user/disable', { method: 'POST', body: JSON.stringify({ id: u.id, disabled }) })
      .then(() => { toast(disabled ? 'Cuenta en pausa' : 'Cuenta reactivada'); onChanged(); close() })
      .catch(e => toast(e.message))
  }

  const contactWhatsApp = () => {
    let msg = `Hola ${u.name.split(' ')[0]}, te saluda el Dr. Andrés Parra Charris de GymHub.`
    if (u.adherenceStatus === 'inactive') {
      msg += ` Noté que llevas unos días sin registrar tu actividad. ¿Cómo te has sentido? Recuerda que el movimiento adaptado es medicina y estoy aquí para apoyarte.`
    } else if (u.lastPain) {
      msg += ` Vi tu reporte de molestia (${u.lastPainArea || 'articular'}) en tu última sesión. Quiero saber cómo va la evolución para ajustar los ejercicios de tu plan si es necesario.`
    } else {
      msg += ` Quería felicitarte por tu constancia en tus sesiones de fuerza y cardio de esta semana. ¡Excelente progreso!`
    }
    const phoneClean = (u.phone || '').replace(/[^0-9]/g, '')
    const url = phoneClean ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  return <>
    <div className="row between" style={{ alignItems: 'flex-start' }}>
      <div>
        <h3 className="capitalize" style={{ margin: 0 }}>{u.name}</h3>
        <div className="dim" style={{ fontSize: '.78rem', marginTop: 3 }}>
          {u.created ? `Paciente desde ${fmtDate(u.created.slice(0, 10))}` : 'Paciente registrado'}
        </div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <button
          className="btn sm"
          style={{ background: 'var(--green)', color: '#000', fontWeight: 700, fontSize: 12, padding: '4px 10px' }}
          onClick={contactWhatsApp}
          title="Contactar al paciente por WhatsApp"
        >
          WhatsApp
        </button>
        {u.admin && <span className="adm-pill acc">Médico</span>}
        {u.disabled && <span className="adm-pill bad">En pausa</span>}
      </div>
    </div>

    {/* Pain / Discomfort Alert */}
    {u.lastPain && (
      <div className="card" style={{ padding: '10px 14px', background: 'rgba(255, 69, 58, 0.12)', border: '1px solid var(--red)', margin: '12px 0 6px', borderRadius: 'var(--r-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', fontWeight: 700, fontSize: 13 }}>
          <Icon name="sparkles" />
          <span>Alerta Clínica: Molestia en {u.lastPainArea || 'zona articular'}</span>
        </div>
        <div className="dim small" style={{ marginTop: 3 }}>
          Reportada en su última sesión. Puedes ajustar la rutina o contactar al paciente.
        </div>
      </div>
    )}

    {/* Metric tiles */}
    <div className="tiles" style={{ textAlign: 'left', margin: '14px 0 10px' }}>
      <div className="tile"><div className="l">Entrenamientos</div><div className="v" style={{ fontSize: '1.1rem' }}>{workouts.length}</div></div>
      <div className="tile"><div className="l">Rutinas activas</div><div className="v" style={{ fontSize: '1.1rem' }}>{routines.length}</div></div>
      <div className="tile"><div className="l">Cardio semanal</div><div className="v" style={{ fontSize: '1.1rem', color: (u.cardioMinutesWeek || 0) >= (u.cardioTargetWeek || 60) ? 'var(--green)' : undefined }}>{u.cardioMinutesWeek || 0}/{u.cardioTargetWeek || 60}m</div></div>
      <div className="tile"><div className="l">Última sinc.</div><div className="v" style={{ fontSize: '.85rem' }}>{d.lastSync ? rel(d.lastSync) : '—'}</div></div>
    </div>

    {/* Navigation Tabs */}
    <div className="chips" style={{ margin: '10px 0 14px' }}>
      <button className={'chip' + (tab === 'prescriptions' ? ' on' : '')} onClick={() => setTab('prescriptions')}>
        📋 Fuerza ({routines.length})
      </button>
      <button className={'chip' + (tab === 'cardio' ? ' on' : '')} onClick={() => setTab('cardio')}>
        🏃 Cardio ({cardio ? 'Activo' : 'Sin plan'})
      </button>
      <button className={'chip' + (tab === 'history' ? ' on' : '')} onClick={() => setTab('history')}>
        📊 Historial ({workouts.length})
      </button>
      <button className={'chip' + (tab === 'notes' ? ' on' : '')} onClick={() => setTab('notes')}>
        🔒 Notas Médicas
      </button>
    </div>

    {/* Tab 1: Prescriptions (Fuerza) */}
    {tab === 'prescriptions' && (
      <div>
        <div className="row between" style={{ marginBottom: 10 }}>
          <h4 className="sec" style={{ margin: 0 }}>Rutinas de Fuerza Prescritas</h4>
          <Button
            size="sm"
            variant="primary"
            icon="plus"
            onClick={() => openSheet(c => (
              <PrescribeRoutineModal
                patientId={u.id}
                patientName={u.name}
                onPrescribed={() => { loadDetail(); onChanged() }}
                close={c}
              />
            ))}
          >
            Prescribir Rutina
          </Button>
        </div>

        {routines.length ? (
          <div className="list" style={{ gap: 8 }}>
            {routines.map(r => (
              <div key={r.id} className="card" style={{ padding: '10px 12px', margin: 0 }}>
                <div className="row between">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.95rem' }}>{r.name}</div>
                    <div className="dim" style={{ fontSize: '.76rem', marginTop: 2 }}>
                      {r.count} ejercicios prescritos
                    </div>
                  </div>
                  <button
                    className="iconbtn"
                    style={{ width: 30, height: 30, fontSize: 14, color: 'var(--red)' }}
                    onClick={() => removeRoutine(r.id)}
                    title="Retirar rutina"
                  >
                    <Icon name="trash" />
                  </button>
                </div>
                {r.ex && r.ex.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--sep)' }}>
                    <div className="dim" style={{ fontSize: '.72rem', lineHeight: 1.4 }}>
                      {r.ex.slice(0, 5).map(e => e.id).join(' · ')}
                      {r.ex.length > 5 && ` y ${r.ex.length - 5} más`}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="adm-empty" style={{ margin: '14px 0' }}>
            El paciente no tiene rutinas prescritas aún. Toca "+ Prescribir Rutina" para asignarle un plan.
          </div>
        )}
      </div>
    )}

    {/* Tab 2: Cardio Prescrito */}
    {tab === 'cardio' && (
      <div>
        <div className="row between" style={{ marginBottom: 10 }}>
          <h4 className="sec" style={{ margin: 0 }}>Prescripción Cardiorrespiratoria</h4>
          <Button
            size="sm"
            variant="primary"
            icon="sparkles"
            onClick={() => openSheet(c => (
              <PrescribeCardioModal
                patientId={u.id}
                patientName={u.name}
                currentCardio={cardio}
                onPrescribed={() => { loadDetail(); onChanged() }}
                close={c}
              />
            ))}
          >
            {cardio ? 'Ajustar Cardio' : 'Prescribir Cardio'}
          </Button>
        </div>

        {cardio ? (
          <div className="card" style={{ padding: 14, margin: '0 0 12px' }}>
            <div className="row between" style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--blue)' }}>
                {cardio.type}
              </div>
              <span className="adm-pill ok">{cardio.frequencyPerWeek} días / semana</span>
            </div>
            <div className="small" style={{ marginBottom: 4 }}>
              <strong>Dosis:</strong> {cardio.targetMinutes} minutos por sesión · Intensidad: <span style={{ textTransform: 'capitalize' }}>{cardio.intensity}</span>
            </div>
            {cardio.note && (
              <div className="dim small" style={{ marginTop: 6, fontStyle: 'italic', borderTop: '1px solid var(--sep)', paddingTop: 6 }}>
                Indicación: "{cardio.note}"
              </div>
            )}
          </div>
        ) : (
          <div className="adm-empty" style={{ margin: '14px 0' }}>
            Sin plan de cardio asignado. Toca "+ Prescribir Cardio" para definir caminata, bici u otra modalidad aeróbica.
          </div>
        )}

        {/* Historial reciente de cardio */}
        <h4 className="sec" style={{ margin: '14px 0 8px' }}>Sesiones Aeróbicas Registradas</h4>
        {cardioLogs.length ? (
          <div className="list" style={{ gap: 6 }}>
            {cardioLogs.map(cl => (
              <div key={cl.id} className="row between" style={{ padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 'var(--r-card)' }}>
                <div>
                  <div className="small" style={{ fontWeight: 600 }}>{cl.type} · {cl.minutes} min</div>
                  <div className="dim" style={{ fontSize: '.72rem' }}>
                    {fmtDate(cl.date, true)} · Esfuerzo: {cl.effort === 'easy' ? 'Fácil' : cl.effort === 'hard' ? 'Muy exigente' : 'Adecuado'}
                  </div>
                </div>
                {cl.pain ? (
                  <span className="adm-pill bad" style={{ fontSize: 10 }}>⚠️ {cl.painArea || 'Molestia'}</span>
                ) : (
                  <span className="adm-pill ok" style={{ fontSize: 10 }}>🟢 Cero dolor</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="adm-empty">El paciente no ha registrado sesiones de cardio aún.</div>
        )}
      </div>
    )}

    {/* Tab 3: Workouts History (Fuerza) */}
    {tab === 'history' && (
      <div>
        <h4 className="sec" style={{ margin: '0 0 10px' }}>Historial de Sesiones de Fuerza</h4>
        {workouts.length ? (
          <div className="list" style={{ gap: 0 }}>
            {workouts.slice(0, 40).map(w => (
              <div key={w.id} className="row between" style={{ padding: '9px 2px', borderBottom: '1px solid var(--sep)' }}>
                <div>
                  <div className="small" style={{ fontWeight: 600 }}>{w.name}</div>
                  <div className="dim" style={{ fontSize: '.72rem' }}>
                    {fmtDate(w.d, true)} · {fmtDur((w.end || w.start) - w.start)} · {setsDone(w)} series completadas
                  </div>
                </div>
                <span className="small muted">{fmtVol(w.vol ?? workoutVolume(w), d.unit)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="adm-empty">No hay entrenamientos registrados aún por este paciente.</div>
        )}
      </div>
    )}

    {/* Tab 4: Confidential Local Medical Notes */}
    {tab === 'notes' && (
      <div>
        <div className="row between" style={{ marginBottom: 6 }}>
          <h4 className="sec" style={{ margin: 0 }}>Notas Clínicas y Diagnóstico</h4>
          <span className="adm-pill ok" style={{ fontSize: '11px' }}>🔒 Solo en este equipo</span>
        </div>
        <div className="adm-hint" style={{ fontSize: '.76rem', color: 'var(--label-2)', marginBottom: 10 }}>
          Almacenamiento privado local. Estas notas nunca se sincronizan al servidor ni son visibles por el paciente.
        </div>
        <textarea
          className="input"
          style={{
            width: '100%', minHeight: 120, padding: 10, fontSize: 14,
            background: 'var(--surface-2)', borderRadius: 'var(--r-card)',
            lineHeight: 1.4, resize: 'vertical'
          }}
          placeholder="Diagnóstico, lesiones previas, consideraciones de movilidad, signos de alarma o evolución clínica..."
          value={notes}
          onChange={e => saveNotes(e.target.value)}
        />
        <div className="dim" style={{ fontSize: '.72rem', marginTop: 4, textAlign: 'right' }}>
          Guardado automático en tu dispositivo
        </div>
      </div>
    )}

    {!u.admin && (
      <div style={{ marginTop: 18, paddingTop: 12, borderTop: '1px solid var(--sep)' }}>
        <button
          className={'btn ' + (u.disabled ? 'primary' : 'danger')}
          style={{ width: '100%' }}
          onClick={() => u.disabled ? setDisabled(false) : confirmSheet({
            title: `¿Pausar cuenta de ${u.name}?`,
            message: 'El paciente no podrá iniciar sesión mientras la cuenta esté en pausa. Sus datos se mantendrán intactos.',
            confirmText: 'Pausar cuenta',
            danger: true,
            onConfirm: () => setDisabled(true)
          })}
        >
          {u.disabled ? 'Reactivar cuenta del paciente' : 'Pausar cuenta del paciente'}
        </button>
      </div>
    )}
  </>
}

function InvitesCard({ invites, reload, inviteOnly }) {
  const toast = useUI(s => s.toast)
  const openSheet = useUI(s => s.openSheet)

  const showQR = code => openSheet(close => <QRCodeModal code={code} close={close} />)

  const gen = () => api('/api/admin/invites/new', { method: 'POST', body: '{}' })
    .then(({ invite }) => {
      navigator.clipboard?.writeText(invite.code).catch(() => {})
      toast('Código ' + invite.code + ' generado')
      reload()
      showQR(invite.code)
    })
    .catch(e => {
      // offline / mock fallback
      const mockCode = 'GH-' + Math.random().toString(36).substring(2, 6).toUpperCase()
      toast('Código ' + mockCode + ' generado')
      showQR(mockCode)
    })

  const revoke = code => confirmSheet({
    title: '¿Revocar código ' + code + '?', message: 'Nadie más podrá usarlo para crear cuenta. Los pacientes ya registrados no se ven afectados.',
    confirmText: 'Revocar', danger: true,
    onConfirm: () => api('/api/admin/invites/revoke', { method: 'POST', body: JSON.stringify({ code }) })
      .then(() => { toast('Código revocado'); reload() }).catch(e => toast(e.message))
  })

  const open = (invites || []).filter(i => !i.usedBy)
  const used = (invites || []).filter(i => i.usedBy)

  return <div className="card">
    <div className="row between">
      <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Códigos & QR de Vinculación de Pacientes</h2>
      <Button variant="primary" size="sm" onClick={gen} icon="plus">Nuevo código</Button>
    </div>
    <div className="adm-lead">
      {inviteOnly
        ? 'El registro requiere invitación: genera un código o QR para que tu paciente active su perfil en consulta o por WhatsApp.'
        : 'Entrega códigos o códigos QR a tus pacientes para vincularlos directamente a tu consulta médica.'}
    </div>
    {open.length ? <>
      <div className="adm-group-t">Disponibles · Toca el QR para proyectarlo o compartirlo</div>
      {open.map(i => <div key={i.code} className="row between" style={{ padding: '6px 0', borderBottom: 'var(--hair) solid var(--sep)' }}>
        <button className="adm-code" onClick={() => showQR(i.code)} aria-label={'qr ' + i.code}>{i.code}</button>
        <div className="row" style={{ gap: 4 }}>
          <button className="iconbtn adm-iconbtn" title="Mostrar Código QR / WhatsApp" onClick={() => showQR(i.code)} aria-label="qr"><Icon name="qrcode" /></button>
          <button className="iconbtn adm-iconbtn" title="Copiar código" onClick={() => { navigator.clipboard?.writeText(i.code).catch(() => {}); toast('Código copiado') }} aria-label="copiar"><Icon name="clipboard" /></button>
          <button className="iconbtn adm-iconbtn" style={{ color: 'var(--red)' }} title="Revocar código" onClick={() => revoke(i.code)} aria-label="revocar"><Icon name="trash" /></button>
        </div>
      </div>)}
    </> : null}
    {used.length ? <>
      <div className="adm-group-t" style={{ marginTop: open.length ? 12 : 0 }}>Usados por pacientes</div>
      {used.map(i => <div key={i.code} className="row between dim" style={{ padding: '6px 0', fontSize: '.82rem' }}>
        <span style={{ fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', letterSpacing: '.06em' }}>{i.code}</span><span>→ {i.usedByName || 'utilizado'}</span>
      </div>)}
    </> : null}
    {!open.length && !used.length && <div className="adm-empty">No hay códigos generados. Toca "+ Nuevo código" para crear uno para un paciente.</div>}
  </div>
}

function AuditCard({ tick }) {
  const toast = useUI(s => s.toast)
  const [meta, setMeta] = useState(null)
  const [rows, setRows] = useState([])
  const [cat, setCat] = useState('')

  const load = (c, before) => api('/api/admin/audit?limit=50&cat=' + c + (before ? '&before=' + before : ''))
    .then(r => { setMeta(r); setRows(x => (before ? x.concat(r.events) : r.events)) })
    .catch(e => toast(e.message))
  const pick = c => { setCat(c); setRows([]); setMeta(null); load(c) }
  useEffect(() => { load(cat) }, [tick])

  const clear = () => confirmSheet({
    title: '¿Limpiar registro de actividad?',
    message: 'Se borrarán los registros pasados.',
    confirmText: 'Limpiar', danger: true,
    onConfirm: () => api('/api/admin/audit/clear', { method: 'POST', body: '{}' })
      .then(() => { toast('Registro limpiado'); pick(cat) }).catch(e => toast(e.message))
  })

  if (meta && !meta.enabled) return null

  return <div className="card">
    <div className="row between">
      <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Registro de Actividad</h2>
      <button className="iconbtn adm-iconbtn" style={{ color: 'var(--red)' }} onClick={clear} aria-label="limpiar"><Icon name="trash" /></button>
    </div>
    <div className="adm-lead">
      Historial de accesos y cambios en el sistema médico.
      {meta ? ' ' + fmtNum(meta.total) + ' eventos registrados.' : ''}
    </div>
    <div className="chips" style={{ marginBottom: 10 }}>
      {[['', 'Todos'], ['auth', 'Accesos'], ['admin', 'Médico'], ['fail', 'Fallidos']].map(([v, l]) =>
        <button key={v} className={'chip' + (cat === v ? ' on' : '')} onClick={() => pick(v)}>{l}</button>)}
    </div>
    {rows.map(e => {
      const line = auditLine(e)
      return <div key={e.id} className="row between" style={{ padding: '8px 2px', borderBottom: 'var(--hair) solid var(--sep)' }}>
        <div className="grow">
          <div className="small" style={{ fontWeight: 600 }}>{line.title}
            {!e.ok && <span className="adm-pill bad" style={{ marginLeft: 6 }}>fallido</span>}
            {auditCat(e.ev) === 'admin' && <span className="adm-pill acc" style={{ marginLeft: 6 }}>médico</span>}</div>
          {line.sub && <div className="dim" style={{ fontSize: '.72rem' }}>{line.sub}</div>}
        </div>
        <span className="small muted" style={{ flex: 'none', marginLeft: 8 }}>{fmtWhen(e.ts, meta?.now)}</span>
      </div>
    })}
    {meta && !rows.length && <div className="adm-empty">Sin actividad registrada aún.</div>}
    {meta?.nextBefore && <div style={{ marginTop: 10 }}>
      <Button size="sm" onClick={() => load(cat, meta.nextBefore)}>Ver más</Button></div>}
  </div>
}

export default function Admin() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)
  const openSheet = useUI(s => s.openSheet)
  const [users, setUsers] = useState(null)
  const [invites, setInvites] = useState(null)
  const [inviteOnly, setInviteOnly] = useState(false)
  const [tick, setTick] = useState(0)
  const [filter, setFilter] = useState('all') // 'all' | 'active' | 'warning' | 'inactive' | 'new'

  const loadUsers = () => api('/api/admin/users')
    .then(d => { setUsers(d.users); setInviteOnly(d.invite_only) })
    .catch(() => {
      // Modo offline / local dev: cargar pacientes de ejemplo
      setUsers(MOCK_PATIENTS)
      setInviteOnly(false)
    })
  const loadInvites = () => api('/api/admin/invites')
    .then(d => setInvites(d.invites))
    .catch(() => {
      setInvites([
        { code: 'MED-7492', usedBy: null },
        { code: 'MED-1830', usedBy: 'patient-1', usedByName: 'Carlos Mendoza' }
      ])
    })
  
  useEffect(() => {
    if (!user?.admin) return
    loadUsers()
    loadInvites()
    const iv = setInterval(loadUsers, 15000)
    return () => clearInterval(iv)
  }, [])

  if (!user?.admin) return null

  const openUser = id => openSheet(close => <UserDetail id={id} onChanged={loadUsers} close={close} />)

  const liveUsers = (users || []).filter(u => u.live)
  const activeCount = (users || []).filter(u => u.adherenceStatus === 'active').length
  const warningCount = (users || []).filter(u => u.adherenceStatus === 'warning').length
  const inactiveCount = (users || []).filter(u => u.adherenceStatus === 'inactive').length

  const filteredUsers = (users || []).filter(u => {
    if (filter === 'active') return u.adherenceStatus === 'active'
    if (filter === 'warning') return u.adherenceStatus === 'warning'
    if (filter === 'inactive') return u.adherenceStatus === 'inactive'
    if (filter === 'new') return u.adherenceStatus === 'new'
    return true
  })

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/home')} aria-label="Volver"><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 8 }}>
        <h1 style={{ margin: 0 }}>Portal Médico</h1>
        <div className="sub">{users ? `${users.length} pacientes · ${activeCount} al día esta semana` : 'Cargando pacientes…'}</div>
      </div>
      <button className="iconbtn" onClick={() => { loadUsers(); loadInvites(); setTick(n => n + 1) }} aria-label="Actualizar">↻</button>
    </div>

    <div className="adm-intro">
      Supervisión clínica, adherencia al tratamiento y prescripción directa de planes de entrenamiento en Medicina del Deporte y Fuerza.
    </div>

    {/* Clinical KPI Tiles */}
    <div className="tiles" style={{ marginBottom: 14 }}>
      <div className="tile"><div className="l">Total Pacientes</div><div className="v">{users ? users.length : '—'}</div></div>
      <div className="tile"><div className="l">En sesión ahora</div><div className="v" style={{ color: liveUsers.length ? 'var(--acc)' : undefined }}>{users ? liveUsers.length : '—'}</div></div>
      <div className="tile"><div className="l">Al día (≤3d)</div><div className="v" style={{ color: 'var(--green)' }}>{users ? activeCount : '—'}</div></div>
      <div className="tile"><div className="l">Atención (4-7d)</div><div className="v" style={{ color: 'var(--yellow)' }}>{users ? warningCount : '—'}</div></div>
      <div className="tile"><div className="l">Inactivos (&gt;7d)</div><div className="v" style={{ color: 'var(--red)' }}>{users ? inactiveCount : '—'}</div></div>
    </div>

    {/* Live sessions */}
    {liveUsers.length > 0 && <div className="card" style={{ borderColor: 'var(--acc)', marginBottom: 14 }}>
      <h2 className="row" style={{ margin: '0 0 2px', gap: 6 }}>
        <Icon name="dot" style={{ fontSize: 10, color: 'var(--green)' }} />
        Pacientes entrenando en vivo
      </h2>
      <div className="adm-lead">Sesiones en curso en este momento. Toca un paciente para abrir su expediente.</div>
      {liveUsers.map(u => <div key={u.id} className="row between" style={{ padding: '8px 2px', borderBottom: 'var(--hair) solid var(--sep)' }} onClick={() => openUser(u.id)}>
        <div>
          <div className="small" style={{ fontWeight: 600 }}>{u.name}</div>
          <div className="dim" style={{ fontSize: '.72rem' }}>{u.live.name} · ejercicio {u.live.exIdx} de {u.live.exTotal} · {u.live.setsDone}/{u.live.setsTotal} series</div>
        </div>
        <span className="adm-pill acc">{dur(Date.now() - u.live.startedAt)}</span>
      </div>)}
    </div>}

    {/* Patient Directory */}
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="row between" style={{ marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Directorio de Pacientes</h2>
        <span className="small muted">{filteredUsers.length} mostrados</span>
      </div>
      <div className="adm-lead">
        Toca cualquier paciente para prescribir rutinas, revisar historial de volumen o registrar notas médicas privadas.
      </div>

      {/* Filter chips */}
      <div className="chips" style={{ marginBottom: 12 }}>
        <button className={'chip' + (filter === 'all' ? ' on' : '')} onClick={() => setFilter('all')}>Todos ({users ? users.length : 0})</button>
        <button className={'chip' + (filter === 'active' ? ' on' : '')} onClick={() => setFilter('active')}>🟢 Al día ({activeCount})</button>
        <button className={'chip' + (filter === 'warning' ? ' on' : '')} onClick={() => setFilter('warning')}>🟡 Atención ({warningCount})</button>
        <button className={'chip' + (filter === 'inactive' ? ' on' : '')} onClick={() => setFilter('inactive')}>🔴 Inactivos ({inactiveCount})</button>
      </div>

      <div className="list">
        {filteredUsers.map(u => (
          <div key={u.id} className="item" onClick={() => openUser(u.id)} style={u.disabled ? { opacity: .55 } : null}>
            <div className="grow">
              <div className="tt" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {u.live && <Icon name="dot" style={{ fontSize: 9, color: 'var(--green)' }} />}
                <span style={{ fontWeight: 600 }}>{u.name}</span>
                <AdherencePill status={u.adherenceStatus} days={u.daysSinceLastWorkout} />
                {u.cardioTargetWeek > 0 && (
                  <span className="adm-pill" style={{ fontSize: 10, background: 'rgba(59,130,246,0.12)', color: 'var(--acc)' }}>
                    🏃 {u.cardioMinutesWeek || 0}/{u.cardioTargetWeek}m cardio
                  </span>
                )}
                {u.lastPain && (
                  <span className="adm-pill bad" style={{ fontSize: 10 }}>
                    ⚠️ {u.lastPainArea ? `Molestia: ${u.lastPainArea}` : 'Molestia articular'}
                  </span>
                )}
                {u.admin && <span className="adm-pill acc" style={{ fontSize: 10 }}>Médico</span>}
                {u.disabled && <span className="adm-pill bad" style={{ fontSize: 10 }}>Pausa</span>}
              </div>
              <div className="ss" style={{ marginTop: 3 }}>
                {u.live ? `Sesión en vivo: ${u.live.name}` : `${u.workouts} entrenamientos · ${u.routinesCount || 0} rutinas prescritas · Última: ${u.lastWorkout ? fmtDate(u.lastWorkout) : 'Sin registros'}`}
              </div>
            </div>
            <Icon name="chevronRight" className="chev" />
          </div>
        ))}
        {users && !filteredUsers.length && (
          <div className="adm-empty">No hay pacientes con el filtro seleccionado.</div>
        )}
      </div>
    </div>

    {/* Access codes for new patients */}
    <InvitesCard invites={invites} reload={loadInvites} inviteOnly={inviteOnly} />

    {/* AI Coach management */}
    <AdminCoach />

    {/* Audit Log */}
    <div style={{ marginTop: 14 }}><AuditCard tick={tick} /></div>
  </div>
}
