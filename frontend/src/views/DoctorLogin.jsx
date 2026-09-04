import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { webauthnOK, passkeyLogin } from '../lib/api.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

export default function DoctorLogin() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const setUser = useStore(s => s.setUser)
  const pullState = useStore(s => s.pullState)

  useEffect(() => {
    if (user?.admin) {
      nav('/admin', { replace: true })
    }
  }, [user?.admin, nav])

  const loginAsDoctor = () => {
    setUser({ id: 'doc-andres-parra', name: 'Dr. Andrés Parra Charris', admin: true })
    useUI.getState().toast('Sesión iniciada: Dr. Andrés Parra (Portal Médico)')
    nav('/admin', { replace: true })
  }

  const signInPasskey = async () => {
    try {
      const u = await passkeyLogin()
      setUser(u)
      await pullState()
      useUI.getState().toast(`Bienvenido, ${u.name}`)
      nav('/admin', { replace: true })
    } catch (e) {
      if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') {
        useUI.getState().toast(e.message || 'Error al iniciar sesión')
      }
    }
  }

  const wrap = { display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }

  return (
    <div className="narrow" style={wrap}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <img
          src="logo.png"
          alt="Dr. Andrés Parra Charris"
          style={{
            width: 115,
            height: 115,
            borderRadius: '50%',
            objectFit: 'contain',
            background: '#000',
            border: '2px solid var(--acc)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}
        />
      </div>

      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--acc)', marginTop: 2 }}>
        DR. ANDRÉS PARRA CHARRIS
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', margin: '4px 0 6px' }}>
        Portal Médico Privado
      </h1>
      <div className="muted small" style={{ letterSpacing: '.02em', marginBottom: 24 }}>
        Medicina del Deporte · Prescripción & Control Clínico
      </div>

      <div
        className="card"
        style={{
          padding: 22,
          border: '1.5px solid var(--acc)',
          background: 'linear-gradient(180deg, rgba(200,255,0,0.08) 0%, rgba(0,0,0,0) 100%)',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Icon name="sparkles" style={{ color: 'var(--acc)', fontSize: 18 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--acc)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Acceso Exclusivo Especialista
          </span>
        </div>

        <Button
          variant="primary"
          icon="sparkles"
          onClick={loginAsDoctor}
        >
          Ingresar como Dr. Andrés Parra
        </Button>

        {webauthnOK() && (
          <div style={{ marginTop: 10 }}>
            <Button icon="person" onClick={signInPasskey}>
              Ingresar con Llave Biométrica (Passkey)
            </Button>
          </div>
        )}

        <div className="dim" style={{ fontSize: '.76rem', marginTop: 12, lineHeight: 1.45 }}>
          Este portal está restringido para la gestión de adherencia, expedientes y prescripción médica de entrenamientos.
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <button
          className="btn ghost dim"
          style={{ fontSize: 13 }}
          onClick={() => nav('/login')}
        >
          ← Ir a la vista pública de pacientes
        </button>
      </div>
    </div>
  )
}
