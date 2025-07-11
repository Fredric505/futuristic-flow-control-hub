import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, FileText, History, Settings, User, Users, CreditCard, Wrench, MessageCircle, MessageSquare, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import ProcessForm from '@/components/ProcessForm';
import ProcessList from '@/components/ProcessList';
import AddUserForm from '@/components/AddUserForm';
import ManageUsers from '@/components/ManageUsers';
import ReloadCredits from '@/components/ReloadCredits';
import InstanceSettings from '@/components/InstanceSettings';
import MessageHistory from '@/components/MessageHistory';
import AdminMessageHistory from '@/components/AdminMessageHistory';
import MobileSidebar from '@/components/MobileSidebar';
import { supabase } from '@/integrations/supabase/client';
import SmsSettings from '@/components/SmsSettings';
import SmsSender from '@/components/SmsSender';
import SmsProcessForm from '@/components/SmsProcessForm';
import SmsTemplates from '@/components/SmsTemplates';
import DomainManager from '@/components/DomainManager';
import TelegramBotManager from '@/components/TelegramBotManager';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [serverConfigOpen, setServerConfigOpen] = useState(false);
  const [serverSettings, setServerSettings] = useState({
    chat_id: '',
    token: ''
  });
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [subdomainModalOpen, setSubdomainModalOpen] = useState(false);
  const [nameserversModalOpen, setNameserversModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newSubdomain, setNewSubdomain] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [domains, setDomains] = useState<string[]>([]);
  const [subdomains, setSubdomains] = useState<string[]>([]);
  const [nameservers] = useState(['srv1.serverapps.top', 'srv2.serverapps.top']);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeProcesses: 0,
    messagesSent: 0,
    systemCredits: 0
  });

  useEffect(() => {
    checkAuth();
    loadStats();
    if (activeSection === 'server-config-main') {
      loadServerSettings();
    }
  }, [activeSection]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Admin auth check:', session?.user?.email);
    if (!session || session.user.email !== 'fredric@gmail.com') {
      navigate('/login');
    }
  };

  const loadStats = async () => {
    try {
      console.log('Loading admin stats...');
      
      // Load total users
      const { data: users } = await supabase
        .from('profiles')
        .select('credits');

      // Load processes for current user only (admin only sees their own processes)
      const { data: { user } } = await supabase.auth.getUser();
      const { data: processes } = await supabase
        .from('processes')
        .select('id')
        .eq('user_id', user?.id || '');

      // Load messages for current user only
      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .eq('user_id', user?.id || '');

      console.log('Stats loaded:', { users, processes, messages });

      const totalCredits = users?.reduce((sum: number, user: any) => sum + (user.credits || 0), 0) || 0;

      setStats({
        totalUsers: users?.length || 0,
        activeProcesses: processes?.length || 0,
        messagesSent: messages?.length || 0,
        systemCredits: totalCredits
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadServerSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['server_chat_id', 'server_token']);

      if (error) throw error;

      const settings = data?.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {});

      setServerSettings({
        chat_id: settings?.server_chat_id || '',
        token: settings?.server_token || ''
      });
    } catch (error) {
      console.error('Error loading server settings:', error);
    }
  };

  const saveServerSettings = async () => {
    try {
      const settingsToUpdate = [
        { key: 'server_chat_id', value: serverSettings.chat_id },
        { key: 'server_token', value: serverSettings.token }
      ];

      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            setting_key: setting.key,
            setting_value: setting.value,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      console.log('Server settings saved successfully');
    } catch (error) {
      console.error('Error saving server settings:', error);
    }
  };

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard', description: 'Pantalla de inicio' },
    
    // PROCESOS SECTION
    { id: 'add-process', icon: Plus, label: 'Agregar Proceso WhatsApp', description: 'Crear formulario para WhatsApp' },
    { id: 'view-processes', icon: FileText, label: 'Ver Procesos WhatsApp', description: 'Mis procesos WhatsApp guardados' },
    { id: 'sms-process', icon: MessageCircle, label: 'Agregar Proceso SMS', description: 'Crear formulario para SMS' },
    { id: 'sms-view-processes', icon: MessageSquare, label: 'Ver Procesos SMS', description: 'Mis procesos SMS guardados' },
    
    // HISTORIAL SECTION
    { id: 'history', icon: History, label: 'Mi Historial', description: 'Mi historial de mensajes enviados' },
    { id: 'admin-messages', icon: History, label: 'Historial de Usuarios', description: 'Ver mensajes enviados por todos los usuarios' },
    { id: 'sms-templates', icon: FileText, label: 'Plantillas SMS', description: 'Crear y gestionar plantillas SMS' },
    { id: 'admin-access', icon: Wrench, label: 'Accesos Admin', description: 'Configuraciones administrativas' },
    
    // USUARIOS SECTION
    { id: 'add-user', icon: User, label: 'Añadir Usuario', description: 'Asignar correo, contraseña y créditos' },
    { id: 'manage-users', icon: Users, label: 'Gestionar Usuarios', description: 'Editar, borrar y renovar usuarios' },
    { id: 'reload-credits', icon: CreditCard, label: 'Recargar Créditos', description: 'Recargar créditos a usuarios' },
    
    // CONFIGURACIONES DE SERVIDOR
    { id: 'server-config', icon: Settings, label: 'Configuración de Servidor', description: 'Configurar conexión al servidor', hasSubmenu: true },
    
    // CONFIGURACIONES ADMIN
    { id: 'sms-settings', icon: Settings, label: 'Configurar SMS', description: 'Configurar API de mensajes de texto' },
    { id: 'settings', icon: Settings, label: 'Configuraciones', description: 'Configurar instancia y token' },
  ];

  const serverSubmenuItems = [
    { id: 'server-config-main', label: 'Configurar Servidor', description: 'Chat ID y Token' },
    { id: 'domains', label: 'Dominios', description: 'Gestionar dominios del sistema' },
    { id: 'subdomains', label: 'Subdominios', description: 'Gestionar subdominios del sistema' },
    { id: 'telegram-bots', label: 'Bots de Telegram', description: 'Configurar bots para captura de datos' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleServerConfigClick = () => {
    setServerConfigOpen(!serverConfigOpen);
  };

  const handleAddDomain = () => {
    if (newDomain.trim()) {
      setDomains([...domains, newDomain.trim()]);
      setNewDomain('');
      setDomainModalOpen(false);
    }
  };

  const handleAddSubdomain = () => {
    if (newSubdomain.trim() && selectedDomain) {
      setSubdomains([...subdomains, `${newSubdomain.trim()}.${selectedDomain}`]);
      setNewSubdomain('');
      setSelectedDomain('');
      setSubdomainModalOpen(false);
    }
  };

  function renderContent() {
    console.log('Current active section:', activeSection);
    
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total Usuarios</p>
                      <p className="text-2xl lg:text-3xl font-bold">{stats.totalUsers}</p>
                    </div>
                    <Users className="h-6 w-6 lg:h-8 lg:w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-600 to-green-800 text-white border-none">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Mis Procesos</p>
                      <p className="text-2xl lg:text-3xl font-bold">{stats.activeProcesses}</p>
                    </div>
                    <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-600 to-purple-800 text-white border-none">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">Mis Mensajes</p>
                      <p className="text-2xl lg:text-3xl font-bold">{stats.messagesSent}</p>
                    </div>
                    <History className="h-6 w-6 lg:h-8 lg:w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-600 to-orange-800 text-white border-none">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm">Total Créditos</p>
                      <p className="text-2xl lg:text-3xl font-bold">{stats.systemCredits}</p>
                    </div>
                    <CreditCard className="h-6 w-6 lg:h-8 lg:w-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-blue-300">Panel de Control Astro505</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-200/70">
                  Bienvenido al sistema de gestión Astro505. Desde aquí puedes administrar todos los aspectos de la plataforma.
                </p>
              </CardContent>
            </Card>
          </div>
        );
      
      // PROCESOS WHATSAPP
      case 'add-process':
        return <ProcessForm userType="admin" />;
      
      case 'view-processes':
        return <ProcessList userType="admin" />;
      
      // PROCESOS SMS
      case 'sms-process':
        return <SmsProcessForm />;
        
      case 'sms-view-processes':
        return (
          <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-blue-300">Ver Procesos SMS</CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessList userType="admin" processType="sms" />
            </CardContent>
          </Card>
        );
      
      // HISTORIAL Y PLANTILLAS
      case 'history':
        return <MessageHistory />;
      
      case 'admin-messages':
        return <AdminMessageHistory />;

      case 'sms-templates':
        return <SmsTemplates />;
        
      case 'admin-access':
        return (
          <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-blue-300">Accesos Administrativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-blue-200/70">
                <p>Este es el panel de accesos administrativos del sistema.</p>
                <p>Desde aquí se pueden gestionar los permisos y configuraciones avanzadas.</p>
                <p>Solo los administradores tienen acceso a estas funcionalidades.</p>
              </div>
            </CardContent>
          </Card>
        );
      
      // USUARIOS
      case 'add-user':
        return <AddUserForm />;
      
      case 'manage-users':
        return <ManageUsers />;
      
      case 'reload-credits':
        return <ReloadCredits />;
      
      // CONFIGURACIONES DE SERVIDOR
      case 'server-config-main':
        return (
          <div className="space-y-6">
            {/* Bot Telegram Configuration */}
            <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
              <CardHeader className="bg-blue-600/20 border-b border-blue-500/20">
                <CardTitle className="text-blue-300">Bot Telegram</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-2">
                      Chat ID:
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="bg-blue-600/10 p-2 rounded">
                        <MessageCircle className="h-4 w-4 text-blue-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="7219932215"
                        value={serverSettings.chat_id}
                        onChange={(e) => setServerSettings({ ...serverSettings, chat_id: e.target.value })}
                        className="flex-1 p-3 bg-black/30 border border-blue-500/30 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-2">
                      Token:
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="bg-blue-600/10 p-2 rounded">
                        <MessageCircle className="h-4 w-4 text-blue-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="7785623280:AAE3v4kmlOZTpJDLCsp_xE5Ka5Yu-B5cQA"
                        value={serverSettings.token}
                        onChange={(e) => setServerSettings({ ...serverSettings, token: e.target.value })}
                        className="flex-1 p-3 bg-black/30 border border-blue-500/30 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      onClick={saveServerSettings}
                      className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
                    >
                      Guardar Configuración
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Domain Management */}
            <Card className="bg-black/20 backdrop-blur-xl border border-green-500/20">
              <CardHeader className="bg-green-600/20 border-b border-green-500/20">
                <CardTitle className="text-green-300 flex items-center justify-between">
                  Dominios
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setDomainModalOpen(true)}
                      className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-sm"
                    >
                      Agregar Dominio
                    </Button>
                    <Button
                      onClick={() => setNameserversModalOpen(true)}
                      className="bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30 text-sm"
                    >
                      Ver nameservers
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-gray-700/20 p-3 rounded">
                    <span className="text-sm text-gray-400">#</span>
                    <span className="text-sm text-gray-400">Descripción</span>
                    <span className="text-sm text-gray-400">Ruta</span>
                    <span className="text-sm text-gray-400">Acción</span>
                  </div>
                  {domains.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      No tienes dominios que mostrar
                    </div>
                  ) : (
                    domains.map((domain, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-800/20 p-3 rounded">
                        <span className="text-white">{index + 1}</span>
                        <span className="text-white">{domain}</span>
                        <span className="text-white">/{domain}</span>
                        <Button className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-sm">
                          Eliminar
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Subdomain Management */}
            <Card className="bg-black/20 backdrop-blur-xl border border-purple-500/20">
              <CardHeader className="bg-purple-600/20 border-b border-purple-500/20">
                <CardTitle className="text-purple-300 flex items-center justify-between">
                  Subdominios
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setSubdomainModalOpen(true)}
                      className="bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30 text-sm"
                    >
                      Agregar subdominio
                    </Button>
                    <Button
                      onClick={() => setNameserversModalOpen(true)}
                      className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-sm"
                    >
                      Ver nameservers
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-gray-700/20 p-3 rounded">
                    <span className="text-sm text-gray-400">#</span>
                    <span className="text-sm text-gray-400">Descripción</span>
                    <span className="text-sm text-gray-400">Ruta</span>
                    <span className="text-sm text-gray-400">Acción</span>
                  </div>
                  {subdomains.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      No tienes subdominios que mostrar
                    </div>
                  ) : (
                    subdomains.map((subdomain, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-800/20 p-3 rounded">
                        <span className="text-white">{index + 1}</span>
                        <span className="text-white">{subdomain}</span>
                        <span className="text-white">/{subdomain}</span>
                        <Button className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-sm">
                          Eliminar
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Domain Modal */}
            {domainModalOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="bg-white max-w-md w-full mx-4">
                  <CardHeader className="bg-green-500 text-white">
                    <CardTitle>Agregar dominio</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dominio:
                        </label>
                        <div className="flex items-center space-x-2">
                          <div className="bg-gray-100 p-2 rounded">
                            <span className="text-sm">🔗</span>
                          </div>
                          <input
                            type="text"
                            placeholder="dominio.com"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleAddDomain}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          guardar
                        </Button>
                        <Button
                          onClick={() => setDomainModalOpen(false)}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          Cerrar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Subdomain Modal */}
            {subdomainModalOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="bg-white max-w-md w-full mx-4">
                  <CardHeader className="bg-green-500 text-white">
                    <CardTitle>Agregar subdominio</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dominios:
                        </label>
                        <select
                          value={selectedDomain}
                          onChange={(e) => setSelectedDomain(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400"
                        >
                          <option value="">Seleccione un dominio</option>
                          {domains.map((domain, index) => (
                            <option key={index} value={domain}>{domain}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subdominio:
                        </label>
                        <div className="flex items-center space-x-2">
                          <div className="bg-gray-100 p-2 rounded">
                            <span className="text-sm">🔗</span>
                          </div>
                          <input
                            type="text"
                            placeholder="subdominio.com"
                            value={newSubdomain}
                            onChange={(e) => setNewSubdomain(e.target.value)}
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleAddSubdomain}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          guardar
                        </Button>
                        <Button
                          onClick={() => setSubdomainModalOpen(false)}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          Cerrar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Nameservers Modal */}
            {nameserversModalOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="bg-white max-w-md w-full mx-4">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Lista de nameservers</CardTitle>
                    <Button
                      onClick={() => setNameserversModalOpen(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </Button>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {nameservers.map((nameserver, index) => (
                        <div key={index} className="text-gray-700">
                          {nameserver}
                        </div>
                      ))}
                    </div>
                    <div className="mt-6">
                      <Button
                        onClick={() => setNameserversModalOpen(false)}
                        className="w-full bg-teal-500 hover:bg-teal-600 text-white"
                      >
                        Cerrar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );
        
      case 'domains':
        return <DomainManager />;
        
      case 'subdomains':
        return (
          <Card className="bg-black/20 backdrop-blur-xl border border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-orange-300">Gestión de Subdominios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4">
                  <h3 className="text-blue-300 font-medium mb-2">Información sobre Subdominios</h3>
                  <p className="text-blue-200/70 text-sm mb-3">
                    Los subdominios se gestionan automáticamente cuando configuras dominios en la sección "Dominios".
                    Cada subdominio que agregues estará disponible para tus scripts SMS.
                  </p>
                  <p className="text-blue-200/70 text-sm">
                    <strong>Ejemplo:</strong> Si configuras el subdominio "usuario1" con el dominio "ubicacion-device.co",
                    tus scripts serán accesibles en: usuario1.ubicacion-device.co
                  </p>
                </div>
                <div className="text-center">
                  <Button 
                    onClick={() => setActiveSection('domains')}
                    className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30"
                  >
                    Ir a Gestión de Dominios
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'telegram-bots':
        return <TelegramBotManager />;

      // CONFIGURACIONES ADMIN
      case 'sms-settings':
        return <SmsSettings />;
      
      case 'settings':
        return <InstanceSettings />;
      
      default:
        return (
          <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-blue-300">Sección en Desarrollo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-blue-200/70">Esta sección estará disponible próximamente.</p>
            </CardContent>
          </Card>
        );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill-opacity='0.03'%3E%3Cpolygon fill='%23ffffff' points='50 0 60 40 100 50 60 60 50 100 40 60 0 50 40 40'/%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:flex-col w-80 bg-black/30 backdrop-blur-xl border-r border-blue-500/20">
          <div className="flex-shrink-0 p-6 mb-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              ASTRO505 ADMIN
            </h1>
          </div>
          
          <ScrollArea className="flex-1 px-6">
            <nav className="space-y-2 pb-4">
              {/* Dashboard */}
              {menuItems.slice(0, 1).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                      activeSection === item.id
                        ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300'
                        : 'text-blue-200/70 hover:bg-blue-600/10 hover:text-blue-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  </button>
                );
              })}
              
              {/* Separator for Procesos */}
              <div className="py-2">
                <div className="text-blue-300 text-sm font-semibold px-3 py-2 bg-blue-600/10 rounded">
                  GESTIÓN DE PROCESOS
                </div>
              </div>
              
              {/* Procesos Section */}
              {menuItems.slice(1, 5).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                      activeSection === item.id
                        ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300'
                        : 'text-blue-200/70 hover:bg-blue-600/10 hover:text-blue-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  </button>
                );
              })}
              
              {/* Separator for Historial */}
              <div className="py-2">
                <div className="text-blue-300 text-sm font-semibold px-3 py-2 bg-blue-600/10 rounded">
                  HISTORIAL Y PLANTILLAS
                </div>
              </div>
              
              {/* Historial Section */}
              {menuItems.slice(5, 9).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                      activeSection === item.id
                        ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300'
                        : 'text-blue-200/70 hover:bg-blue-600/10 hover:text-blue-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  </button>
                );
              })}
              
              {/* Separator for Usuarios */}
              <div className="py-2">
                <div className="text-green-300 text-sm font-semibold px-3 py-2 bg-green-600/10 rounded">
                  GESTIÓN DE USUARIOS
                </div>
              </div>
              
              {/* Usuarios Section */}
              {menuItems.slice(9, 12).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                      activeSection === item.id
                        ? 'bg-green-600/20 border border-green-500/30 text-green-300'
                        : 'text-green-200/70 hover:bg-green-600/10 hover:text-green-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  </button>
                );
              })}
              
              {/* Separator for Configuraciones de Servidor */}
              <div className="py-2">
                <div className="text-orange-300 text-sm font-semibold px-3 py-2 bg-orange-600/10 rounded">
                  CONFIGURACIONES DE SERVIDOR
                </div>
              </div>
              
              {/* Configuración de Servidor with Submenu */}
              <div>
                <button
                  onClick={handleServerConfigClick}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 text-orange-200/70 hover:bg-orange-600/10 hover:text-orange-300"
                >
                  <Settings className="h-5 w-5" />
                  <div className="text-left flex-1">
                    <div className="font-medium">Configuración de Servidor</div>
                    <div className="text-xs opacity-70">Configurar conexión al servidor</div>
                  </div>
                  {serverConfigOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                
                {/* Submenu */}
                {serverConfigOpen && (
                  <div className="ml-6 mt-1 space-y-1">
                    {serverSubmenuItems.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => setActiveSection(subItem.id)}
                        className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-all duration-200 ${
                          activeSection === subItem.id
                            ? 'bg-orange-600/20 border border-orange-500/30 text-orange-300'
                            : 'text-orange-200/60 hover:bg-orange-600/10 hover:text-orange-300'
                        }`}
                      >
                        <div className="text-left">
                          <div className="font-medium text-sm">{subItem.label}</div>
                          <div className="text-xs opacity-70">{subItem.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Separator for Configuraciones Admin */}
              <div className="py-2">
                <div className="text-red-300 text-sm font-semibold px-3 py-2 bg-red-600/10 rounded">
                  CONFIGURACIONES ADMIN
                </div>
              </div>
              
              {/* Configuraciones Section */}
              {menuItems.slice(13).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                      activeSection === item.id
                        ? 'bg-red-600/20 border border-red-500/30 text-red-300'
                        : 'text-red-200/70 hover:bg-red-600/10 hover:text-red-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </ScrollArea>
          
          <div className="flex-shrink-0 p-6 pt-4 border-t border-blue-500/20">
            <Button 
              onClick={handleLogout}
              className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30"
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Mobile Sidebar */}
        <MobileSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          menuItems={menuItems}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onLogout={handleLogout}
          title="ASTRO505 ADMIN"
        />
        
        {/* Main Content with ScrollArea */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 p-4 lg:p-8 pt-16 lg:pt-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6 lg:mb-8">
                <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                  {menuItems.find(item => item.id === activeSection)?.label || 
                   serverSubmenuItems.find(item => item.id === activeSection)?.label}
                </h2>
                <p className="text-blue-200/70 text-sm lg:text-base">
                  {menuItems.find(item => item.id === activeSection)?.description ||
                   serverSubmenuItems.find(item => item.id === activeSection)?.description}
                </p>
              </div>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 lg:p-8 pt-0">
              <div className="max-w-7xl mx-auto">
                {renderContent()}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
      
      <div className="fixed bottom-4 left-4 text-blue-200/50 text-xs">
        <p>Contacto Admin: +50588897925</p>
      </div>
      
      <div className="fixed bottom-4 right-4 text-blue-200/50 text-xs">
        <p>Versión 1.0.0</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
