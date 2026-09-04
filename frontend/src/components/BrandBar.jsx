import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import Icon from './Icon.jsx'

export default function BrandBar() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)

  return (
    <header className="brand-bar" onClick={() => nav('/home')} role="banner">
      <div className="brand-bar-left">
        <img
          src="logo.png"
          alt="Dr. Andrés Parra Charris Logo"
          className="brand-bar-logo"
        />
        <div className="brand-bar-text">
          <span className="brand-bar-doctor">DR. ANDRÉS PARRA CHARRIS</span>
          <span className="brand-bar-sub">GymHub · Medicina del Deporte</span>
        </div>
      </div>
      <div className="brand-bar-right" onClick={e => { e.stopPropagation(); nav('/settings') }}>
        {S.active ? (
          <span className="brand-status-badge active" onClick={e => { e.stopPropagation(); nav('/workout') }}>
            <span className="pulse-dot" />
            <span>En entrenamiento</span>
          </span>
        ) : (
          <span className="brand-profile-pill" title={user ? user.name : 'Ajustes'}>
            <Icon name="personCircle" />
            <span className="brand-user-name">{user ? user.name : 'Invitado'}</span>
          </span>
        )}
      </div>
    </header>
  )
}
