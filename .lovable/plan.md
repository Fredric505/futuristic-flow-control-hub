# Plan: Corregir la API Key que no coincide con el VPS

## Problema (confirmado con pruebas reales)

El VPS en `http://203.161.47.130:3500` está corriendo bien, pero rechaza todas las peticiones porque la clave guardada en el panel no coincide con la del VPS:

- Panel (`system_settings`): `52089798Aa.` → el VPS responde **Unauthorized**
- VPS (`.env`): `supersecreta123` → responde correctamente

Resultado: el QR nunca se genera y el estado siempre queda en "disconnected" / "qr_pending".

## Solución

Actualizar el valor en la base de datos para que coincida con la clave real del VPS:

```sql
UPDATE system_settings
SET setting_value = 'supersecreta123'
WHERE setting_key = 'whatsapp_webjs_api_key';
```

Después de esto, "Vincular WhatsApp" debería generar el QR de inmediato (ya verifiqué que el VPS responde bien con esa clave).

## Alternativa (si prefieres usar tu clave nueva)

Si quieres usar `52089798Aa.` como clave, en vez de cambiar la base de datos tendrías que editar el `.env` del VPS y reiniciar PM2. Pero la opción de arriba es más rápida y no requiere tocar el VPS.

## Detalles técnicos

- Solo se necesita una migración SQL de un UPDATE; no hay cambios de código.
- El proxy (`whatsapp-webjs-proxy`) ya funciona correctamente; el fallo era exclusivamente la clave.
