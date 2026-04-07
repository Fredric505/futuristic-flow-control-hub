# Plan: Integración WhatsApp Web.js — Paridad completa con UltraMsg

## Resumen

Cada usuario puede vincular su propio WhatsApp escaneando un QR. Los mensajes se envían desde su sesión personal con las **mismas funciones** que UltraMsg: texto, imágenes, ocultación de URLs, y notificaciones a Telegram cuando responden. Si la sesión se desconecta, fallback automático a UltraMsg.

## Arquitectura

```
Frontend (React) ──▶ Edge Functions (proxy) ──▶ VPS (whatsapp-web.js)
                                                    │
                                                    ▼ (mensaje entrante)
                                              Edge Function webhook
                                                    │
                                                    ▼
                                              Telegram notification
```

## VPS API (fuera de Lovable)

API REST con Express + whatsapp-web.js:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/session/start` | POST | Inicia sesión, genera QR |
| `/session/qr/:userId` | GET | Devuelve QR en base64 |
| `/session/status/:userId` | GET | `connected`, `disconnected`, `qr_pending` |
| `/session/send/:userId` | POST | Envía texto + imagen opcional |
| `/session/destroy/:userId` | POST | Cierra sesión |

**Webhook de mensajes entrantes**: Cuando llega un mensaje al WhatsApp del usuario, el VPS llama a `whatsapp-webjs-webhook` con: `{ userId, senderPhone, messageText, senderName }`.

## Base de Datos

**Tabla `user_whatsapp_sessions`** (ya creada):
- id, user_id, session_status, connected_phone, created_at, updated_at

**Settings en `system_settings`**:
- `whatsapp_webjs_api_url` → URL base del VPS
- `whatsapp_webjs_api_key` → Token de autenticación

## Edge Functions

### 1. `whatsapp-webjs-proxy` (ya creada)
Proxy para QR, status, destroy entre frontend y VPS.

### 2. `send-whatsapp-webjs` (ya creada)
Envío con fallback automático a UltraMsg. Soporta texto + imagen.

### 3. `whatsapp-webjs-webhook` (NUEVA) ⭐
Recibe mensajes entrantes del VPS y notifica a Telegram:
1. Recibe: `{ userId, senderPhone, messageText }`
2. Busca procesos del usuario que coincidan con `senderPhone`
3. Obtiene `telegram_bot_token` y `telegram_chat_id` del perfil
4. Envía notificación a Telegram con formato idéntico a `ultramsg-webhook`:
   - 📱 Cliente, modelo, IMEI, serie, propietario
   - 📞 Teléfono del remitente
   - 💬 Texto del mensaje
5. Registra en `whatsapp_telegram_log`

## Frontend

### WhatsAppQRScanner.tsx (ya creado)
- Muestra QR, polling cada 3s, estados visuales, botón desconectar

### Dashboards
- Sección "WhatsApp Personal" en UserDashboard y AdminDashboard
- Admin: botón extra "WA Web" en ProcessList para pruebas

## Lógica de Envío

```
Enviar mensaje WhatsApp
├── ¿Sesión activa? → SÍ → Enviar via VPS (texto + imagen)
│                              ├── Éxito ✅ (sin descuento de créditos)
│                              └── Error → Marcar disconnected → Reenviar via UltraMsg
└── NO → Enviar via UltraMsg (descuenta créditos normalmente)
```

**Funciones con paridad completa:**
- ✅ Envío de texto
- ✅ Envío de imágenes
- ✅ Ocultación de URLs en el mensaje
- ✅ Notificaciones a Telegram al recibir respuestas
- ✅ Registro en whatsapp_telegram_log
- ✅ Fallback automático a UltraMsg

## Restricciones

- **WAPRO (Whapi.cloud)**: exclusivo admin, sin cambios
- **WA Dir**: exclusivo admin, sin cambios
- **Créditos**: envío via whatsapp-web.js NO descuenta créditos
- **Fallback a UltraMsg**: SÍ descuenta créditos

## Pasos de Implementación

1. ✅ Tabla `user_whatsapp_sessions` (ya creada)
2. ✅ Edge function `whatsapp-webjs-proxy` (ya creada)
3. ✅ Edge function `send-whatsapp-webjs` (ya creada)
4. ✅ Componente `WhatsAppQRScanner.tsx` (ya creado)
5. **NUEVO**: Crear edge function `whatsapp-webjs-webhook` para notificaciones Telegram
6. Configurar VPS settings en panel admin (URL + API key)
7. Generar script Node.js completo para el VPS

## Requisito Previo

Montar API de whatsapp-web.js en VPS. Se generará el script completo listo para desplegar.