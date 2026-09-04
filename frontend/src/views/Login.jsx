import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { webauthnOK, passkeyLogin, passkeyRegister, BIO } from '../lib/api.js'
import { hasData } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { DEMO, REPO } from '../lib/demo.js'
import { guestAllowed } from '../lib/guest.js'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

function RegisterSheet({ close }) {
  const { setUser, pushState, pullState, loadConfig } = useStore()
  const config = useStore(s => s.config)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const inviteOnly = !!config?.invite_only
  const ref = useRef(null)
  useEffect(() => { setTimeout(() => ref.current?.focus(), 250) }, [])
  // Boot already fetched this; retry here only if that attempt failed, so the invite field still
  // appears on an instance whose config arrived late rather than never.
  useEffect(() => { loadConfig() }, [loadConfig])
  const go = async () => {
    const n = name.trim()
    if (!n) { useUI.getState().toast(t('Enter a name')); return }
    if (inviteOnly && !code.trim()) { useUI.getState().toast(t('An invite code is required')); return }
    try {
      const u = await passkeyRegister(n, code.trim())
      setUser(u); close()
      if (hasData(useStore.getState().S)) { await pushState(); useUI.getState().toast(t('Profile created — data from this device moved into it')) }
      else { await pullState(); useUI.getState().toast(t('Welcome, {0}', u.name)) }
    } catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') useUI.getState().toast(e.message || t('Registration failed')) }
  }
  return <>
    <h3>{t('Create your profile')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Pick a name, then confirm with {0}. The passkey is saved in your device — no password needed.', BIO)}</div>
    <input ref={ref} className="input" placeholder={t('Your name')} maxLength={40} value={name} onChange={e => setName(e.target.value)} />
    {inviteOnly && <>
      <div style={{ height: 10 }} />
      <input className="input" placeholder={t('Invite code')} maxLength={40} value={code}
        onChange={e => setCode(e.target.value.toUpperCase())} style={{ letterSpacing: '.14em', fontWeight: 600, textAlign: 'center' }} />
      <div className="dim small" style={{ marginTop: 6 }}>{t('This app is invite-only — enter the code you were given.')}</div>
    </>}
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={go}>{t('Create passkey')}</Button>
  </>
}

export default function Login() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const setUser = useStore(s => s.setUser)
  const pullState = useStore(s => s.pullState)
  const setGuest = useStore(s => s.setGuest)
  const config = useStore(s => s.config)
  const canGuest = guestAllowed(config)

  useEffect(() => {
    if (user?.admin) {
      nav('/admin', { replace: true })
    }
  }, [user?.admin, nav])

  const signIn = async () => {
    try {
      const u = await passkeyLogin()
      setUser(u)
      await pullState()
      useUI.getState().toast(t('Welcome back, {0}', u.name))
      if (u.admin) nav('/admin')
      else nav('/home')
    } catch (e) {
      if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') useUI.getState().toast(e.message || t('Sign-in failed'))
    }
  }

  const head = <>
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
      <img src="logo.png" alt="Dr. Andrés Parra Charris" style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'contain', background: '#000', border: '2px solid var(--acc)', boxShadow: '0 8px 30px rgba(0,0,0,0.45)' }} />
    </div>
    <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--acc)', marginTop: 2 }}>DR. ANDRÉS PARRA CHARRIS</div>
    <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', margin: '4px 0 6px' }}>GymHub</h1>
    <div className="muted small" style={{ letterSpacing: '.02em', marginBottom: 20 }}>Medicina del Deporte · Prescripción, Fuerza & Salud</div>
  </>
  const wrap = { display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }

  // Demo build: no backend to sign in against — the only way in is the local guest profile.
  if (DEMO) return (
    <div className="narrow" style={wrap}>
      {head}
      <div className="muted" style={{ marginBottom: 30 }}>{t('Live demo — everything stays in this browser.')}</div>
      <Button variant="primary" icon="sparkles" onClick={() => { setGuest(true); nav('/home') }}>{t('Start the demo')}</Button>
      <div className="card small muted" style={{ textAlign: 'left', marginTop: 16 }}>
        {t('This demo runs entirely in your browser on example data — nothing is sent anywhere. Passkey sign-in and sync across your devices come with the openGym server, which you get by self-hosting it.')}
      </div>
      <div className="dim small" style={{ marginTop: 22, lineHeight: 1.6 }}>
        <a href={REPO} target="_blank" rel="noopener">{t('Self-host it in a minute →')}</a>
      </div>
    </div>
  )

  return (
    <div className="narrow" style={wrap}>
      {head}

      {/* Patient access card */}
      <div className="card" style={{ padding: 20, textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <Icon name="person" style={{ color: 'var(--label-2)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--label-2)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Acceso Pacientes & Deportistas
          </span>
        </div>

        {webauthnOK() ? <>
          <Button icon="person" onClick={signIn}>
            {t('Sign in with passkey')}
          </Button>
          <div style={{ height: 10 }} />
          <Button icon="plus" onClick={() => useUI.getState().openSheet(close => <RegisterSheet close={close} />)}>
            Activar Perfil con Código de Consulta
          </Button>
          {canGuest && <div style={{ height: 10 }} />}
        </> : <div className="card small muted" style={{ textAlign: 'left' }}>{canGuest
          ? t("This browser doesn't support passkeys — you can still use openGym locally on this device.")
          : t("This browser doesn't support passkeys, and this instance requires an account. Try a browser or device with passkey support.")}</div>}

        {canGuest && (
          <Button variant="ghost" className="dim" onClick={() => { setGuest(true); nav('/home') }}>
            Continuar en Modo Consulta / Invitado
          </Button>
        )}
      </div>

      <div className="dim small" style={{ marginTop: 22, lineHeight: 1.5 }}>
        {t('Passkeys use {0} — no passwords.', BIO)}<br />
        Cada paciente cuenta con su plan y registro clínico independiente.
      </div>
    </div>
  )
}
