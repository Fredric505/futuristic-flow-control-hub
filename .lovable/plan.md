

# Plan: Integración WhatsApp Web.js (Sesión QR por Usuario)

## Resumen

Permitir que cada usuario escanee un código QR para vincular su propio WhatsApp. Los mensajes se envían desde su sesión personal. Si la sesión se desconecta, el sistema vuelve automáticamente a UltraMsg. El botón WAPRO sigue siendo exclusivo del admin.

## Arquitectura

```text
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Frontend    │────▶│  Edge Function    │────▶│  VPS         │
│  (React)     │     │  (proxy/bridge)   │     │  whatsapp-   │
│              │     │                   │     │  web.js      │
│ - QR Scanner │     │ - /qr/:userId     │     │  sessions    │
│ - Status     │     │ - /send/:userId   │     │              │
│ - Fallback   │     │ - /status/:userId │     │              │
└──────────────┘     └──────────────────┘     └──────────────┘
```

## Componentes del VPS (fuera de Lovable)

El usuario montará en su VPS una API REST con whatsapp-web.js que exponga:

- `POST /session/start` → inicia sesión, genera QR
- `GET /session/qr/:userId` → devuelve imagen QR o base64
- `GET /session/status/:userId` → estado: `connected`, `disconnected`, `qr_pending`
- `POST /session/send/:userId` → envía mensaje desde la sesión del usuario
- `POST /session/destroy/:userId` → cierra sesión

## Cambios en la Base de Datos

**Nueva tabla `user_whatsapp_sessions`:**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK conceptual a profiles |
| session_status | text | `disconnected`, `qr_pending`, `connected` |
| connected_phone | text | Número vinculado (opcional) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Nuevo setting en `system_settings`:**
- `whatsapp_webjs_api_url` → URL base del VPS
- `whatsapp_webjs_api_key` → Token de autenticación del VPS

## Cambios en el Frontend

### 1. Nuevo componente: `WhatsAppQRScanner.tsx`
- Muestra el QR obtenido del VPS via edge function
- Polling cada 3s para verificar estado de la sesión
- Estados visuales: "Esperando escaneo", "Conectado ✅", "Desconectado"
- Botón para desconectar sesión

### 2. Menú del UserDashboard
- Nueva sección en Configuración: **"WhatsApp Personal"** con icono QrCode
- Muestra estado de conexión y botón para escanear/reconectar

### 3. Menú del AdminDashboard
- Misma sección de QR disponible
- Botón adicional para probar envío con whatsapp-web.js (separado del WAPRO)

### 4. Lógica de envío en `ProcessList.tsx`
- Al enviar mensaje WhatsApp (botón UltraMSG/primer botón):
  1. Verificar si el usuario tiene sesión activa (`user_whatsapp_sessions.session_status = 'connected'`)
  2. Si **sí** → enviar via edge function que redirige al VPS
  3. Si **no** → enviar via UltraMsg como actualmente

### 5. Edge Function: `send-whatsapp-webjs`
- Recibe: userId, phone, message, buttonText, buttonUrl
- Consulta `user_whatsapp_sessions` para verificar sesión activa
- Si activa → llama al VPS API
- Si falla o no activa → fallback a UltraMsg (misma lógica actual)
- Actualiza estado en BD si detecta desconexión

### 6. Edge Function: `whatsapp-webjs-proxy`
- Proxy entre frontend y VPS para QR y status
- Endpoints: start-session, get-qr, get-status, destroy-session
- Autenticación con service role key

## Lógica de Fallback Automático

```text
Usuario intenta enviar
  ├── ¿Tiene sesión activa? ──▶ SÍ ──▶ Enviar via VPS
  │                                        ├── Éxito ✅
  │                                        └── Error ──▶ Marcar sesión como "disconnected"
  │                                                       └── Reenviar via UltraMsg
  └── NO ──▶ Enviar via UltraMsg (comportamiento actual)
```

## Restricciones

- **WAPRO (Whapi.cloud)**: sigue siendo exclusivo del admin, sin cambios
- **Usuarios normales**: solo ven el botón de WhatsApp estándar, que usa su sesión personal o UltraMsg como fallback
- **Admin**: ve todos los botones (UltraMSG, WAPRO, y nuevo botón "WA Web" para pruebas)

## Pasos de Implementación

1. Migración: crear tabla `user_whatsapp_sessions` con RLS
2. Agregar settings del VPS en `system_settings` (URL + API key)
3. Crear edge function `whatsapp-webjs-proxy` (QR, status, destroy)
4. Crear edge function `send-whatsapp-webjs` (envío con fallback)
5. Crear componente `WhatsAppQRScanner.tsx`
6. Agregar sección "WhatsApp Personal" en UserDashboard y AdminDashboard
7. Modificar lógica de envío en ProcessList para detectar sesión activa
8. Agregar botón extra "WA Web" en ProcessList solo para admin

## Requisito Previo

Necesitarás tener tu API de whatsapp-web.js corriendo en el VPS antes de poder conectar. Una vez que tengas la URL y el API key del VPS, los configuramos en la sección de Instancia y procedemos con la implementación.

