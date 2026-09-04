# GEMINI.md

Directrices de arquitectura, diseño y desarrollo para agentes de IA y desarrolladores que trabajen en **`medandresparra-gymhub`**.

---

## 📌 Visión General del Proyecto

**medandresparra-gymhub** es una plataforma clínica y deportiva para la prescripción, dosificación y seguimiento de programas de entrenamiento en **Medicina del Deporte**, fuerza general, salud y **adulto mayor**, liderada por el **Dr. Andrés Parra Charris**.

La plataforma deriva de una versión adaptada, limpia y optimizada de **openGym**, manteniendo su robusto motor de cálculo y enriqueciéndola con identidad médica, gestión de pacientes y privacidad clínica por diseño.

---

## 🏛️ Arquitectura del Sistema

```
gymhub/
├── api/                  # Backend ultraligero en Node.js puro (node:http)
│   ├── server.js         # Servidor principal, WebAuthn (Passkeys), cookies de sesión HMAC
│   ├── coach/            # Lógica del AI Coach
│   └── openapi.yaml      # Especificación de endpoints
├── frontend/             # SPA en React 19 + Vite + Zustand
│   ├── src/
│   │   ├── lib/          # Funciones puras de dominio y motores matemáticos (*.test.js)
│   │   ├── store/        # Zustand (useStore.js: estado persistente, useUI.js: UI efímera)
│   │   ├── views/        # Pantallas (Home, Plan, Workout, Stats, History, Library, Settings, Admin, Login)
│   │   ├── components/   # Componentes reusables (BrandBar, BodyMap, LineChart, Modals, TabBar, etc.)
│   │   └── locales/      # Catálogo i18n (es.js por defecto)
│   └── public/           # Logo oficial (logo.png), manifiesto PWA e iconos generados
├── web/                  # Dockerfile de producción y proxy Nginx
├── scripts/              # Utilidades de mantenimiento y fuentes de traducción
└── docker-compose.yml    # Orquestación de contenedores (api + web)
```

---

## ⚖️ Principios Clínicos y Directrices de Privacidad (Privacy-First)

1. **Privacidad Médica Estricta:**
   - La sincronización cliente-servidor solo transporta **variables físicas del entrenamiento** (ejercicio, series, repeticiones, cargas, RPE/RIR, tiempos de descanso y notas de ejecución técnica).
   - **Cero información clínica sensible en la nube pública:** Diagnósticos, anamnesis, historia clínica o banderas rojas se mantienen exclusivamente en el almacenamiento local del dispositivo del médico (`localStorage` o almacén cifrado local).
2. **Población Objetivo (Fuerza y Adulto Mayor):**
   - Priorizar siempre la seguridad articular, calentamientos específicos (`warmupSets`), descansos adecuados y escalas de esfuerzo percibido claras (RPE / Borg / RIR).

---

## 👑 Jerarquía de Usuarios y Roles

* **Perfil Superior (Médico / Dr. Andrés Parra Charris):**
  - Rol de administrador (`user.admin === true`).
  - Capacidad de supervisar pacientes, evaluar adherencia clínica (días de entrenamiento, semáforo de inactividad) y prescribir rutinas directamente.
* **Perfil Paciente:**
  - Acceso mediante **Passkeys biométricas** (Face ID / Huella dactilar) sin contraseñas.
  - Registro de entrenamientos en vivo, temporizador de descansos guiado y reporte de esfuerzo.

---

## 🛠️ Comandos de Desarrollo y Verificación

### Frontend
```bash
# Servidor de desarrollo con hot-reload
cd frontend && npm run dev

# Suite completa de pruebas unitarias (Vitest)
cd frontend && npm test

# Ejecutar un único archivo de prueba
npx vitest run src/lib/progression.test.js
```

> [!IMPORTANT]
> **Regla de Oro en `frontend/src/lib/`:** Cualquier función pura que calcule cargas, progresiones, 1RM o procese historiales de entrenamiento **debe tener su correspondiente archivo `*.test.js`** al lado y pasar la suite al 100%.

### Docker (Producción / Local Stack)
```bash
cp .env.example .env
docker compose up -d --build
```

---

## 🎨 Identidad Gráfica

* **Nombre de Marca:** `medandresparra-gymhub` (Nombre corto: `GymHub`).
* **Firma Oficial:** **DR. ANDRÉS PARRA CHARRIS** (Medicina del Deporte · Fuerza & Salud).
* **Componente de Marca Global:** [`frontend/src/components/BrandBar.jsx`](file:///Users/apc939/Desktop/AppEjercicios/gymhub/frontend/src/components/BrandBar.jsx) se renderiza en la parte superior de todas las vistas de la aplicación.
* **Activo del Logotipo:** [`frontend/public/logo.png`](file:///Users/apc939/Desktop/AppEjercicios/gymhub/frontend/public/logo.png).
