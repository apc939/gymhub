# medandresparra-gymhub

> Plataforma médica y clínica de prescripción, dosificación y seguimiento de planes de entrenamiento para pacientes de **Medicina del Deporte**, fuerza general, salud y adulto mayor.

Desarrollada y personalizada por el **Dr. Andrés Parra** sobre la base tecnológica robusta de openGym.

---

## 🎯 Enfoque Clínico y de Salud

- **Población Objetivo:** Pacientes de Medicina del Deporte, acondicionamiento de fuerza para la salud, readaptación y prescripción segura para adulto mayor.
- **Jerarquía:** 
  - **Portal Médico / Especialista:** Supervisión de adherencia clínica, prescripción directa de rutinas y planes semanales a los perfiles de los pacientes.
  - **Portal del Paciente:** Interfaz táctil, limpia e intuitiva con soporte para Passkeys (Face ID / Huella), ejecución guiada con vídeos/GIFs y registro de esfuerzo percibido (RPE/RIR).
- **Privacidad Médica (Privacy-First):** Solo las variables técnicas del entrenamiento se sincronizan. Las notas y diagnósticos médicos sensibles se resguardan de forma local y privada.

---

## 🏗️ Estructura del Repositorio

```
gymhub/
├── api/          # Backend ligero en Node.js (Passkeys WebAuthn, persistencia local en JSON)
├── web/          # Dockerfile de producción y proxy Nginx
├── frontend/     # Aplicación cliente en React 19 + Vite (Zustand, Vitest, PWA)
└── docker-compose.yml  # Orquestación de contenedores
```

---

## 🚀 Puesta en Marcha Rápida

### Desarrollo Local (Frontend)
```bash
cd frontend
npm run dev
```
Disponible en: `http://localhost:5173`

### Pruebas Unitarias
```bash
cd frontend
npm test
```

### Ejecución en Docker (Stack Completo)
```bash
cp .env.example .env
docker compose up -d --build
```

---

## 📄 Licencia

Este proyecto deriva de openGym y se distribuye bajo los términos de la licencia **AGPL-3.0-or-later**.
