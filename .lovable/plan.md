

# Plan: Corregir configuración VPS en system_settings

## Problema

La edge function `whatsapp-webjs-proxy` devuelve error 500 porque:

1. **Puerto incorrecto**: La URL guardada es `http://167.99.62.57:3001` pero el VPS debería estar en el puerto `3500` (el que configuraste en el `.env` del VPS con `PORT=3500`)
2. **API Key con texto basura**: El valor es `API Key del VPS: supersecreta123` en vez de solo el token limpio. Esto rompe el header `Authorization: Bearer ...`

## Solución

### Paso 1: Corregir los valores en `system_settings`

Actualizar los dos registros en la base de datos:

```sql
UPDATE system_settings 
SET setting_value = 'http://167.99.62.57:3500' 
WHERE setting_key = 'whatsapp_webjs_api_url';

UPDATE system_settings 
SET setting_value = 'supersecreta123' 
WHERE setting_key = 'whatsapp_webjs_api_key';
```

### Paso 2: Mejorar la edge function para dar mejores errores

Modificar `whatsapp-webjs-proxy` para que siempre devuelva status 200 con `ok: true/false` en el body, en vez de explotar con un 500 genérico. Así cuando haya un error, verás exactamente qué pasó en la pantalla.

### Paso 3: Verificar que el VPS esté corriendo

Antes de probar, asegúrate en tu VPS:
```text
pm2 status          # debe mostrar "whatsapp-api" como "online"
pm2 logs whatsapp-api  # para ver si hay errores
```

Si no lo has iniciado:
```text
cd /root/whatsapp-webjs-api
pm2 start index.js --name whatsapp-api
```

## Lo que tú debes hacer primero

1. Verifica que en tu VPS el archivo `.env` tiene `PORT=3500`
2. Verifica que la API está corriendo: `pm2 status`
3. Prueba desde el VPS mismo: `curl http://localhost:3500/health`
4. Si responde `{"status":"ok"}`, entonces el problema es solo la configuración aquí

## Cambios en código

- `supabase/functions/whatsapp-webjs-proxy/index.ts`: Mejorar manejo de errores para devolver siempre 200 con detalles del error en JSON
- Migración SQL para corregir los dos valores en `system_settings`

