
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, FileText, History, Settings, User, Users, CreditCard, Wrench } from 'lucide-react';
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

const AdminDashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeProcesses: 0,
    messagesSent: 0,
    systemCredits: 0
  });

  useEffect(() => {
    checkAuth();
    loadStats();
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

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard', description: 'Pantalla de inicio' },
    
    // PROCESOS SECTION
    { id: 'add-process', icon: Plus, label: 'Agregar Proceso', description: 'Crear formulario para WhatsApp' },
    { id: 'view-processes', icon: FileText, label: 'Ver Procesos', description: 'Mis procesos guardados' },
    
    // HISTORIAL SECTION
    { id: 'history', icon: History, label: 'Mi Historial', description: 'Mi historial de mensajes enviados' },
    { id: 'admin-messages', icon: History, label: 'Historial de Usuarios', description: 'Ver mensajes enviados por todos los usuarios' },
    { id: 'admin-access', icon: Wrench, label: 'Accesos Admin', description: 'Configuraciones administrativas' },
    
    // USUARIOS SECTION
    { id: 'add-user', icon: User, label: 'Añadir Usuario', description: 'Asignar correo, contraseña y créditos' },
    { id: 'manage-users', icon: Users, label: 'Gestionar Usuarios', description: 'Editar, borrar y renovar usuarios' },
    { id: 'reload-credits', icon: CreditCard, label: 'Recargar Créditos', description: 'Recargar créditos a usuarios' },
    
    // CONFIGURACIONES ADMIN
    { id: 'settings', icon: Settings, label: 'Configuraciones', description: 'Configurar instancia y token' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
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
      
      // HISTORIAL
      case 'history':
        return <MessageHistory />;
      
      case 'admin-messages':
        return <AdminMessageHistory />;
        
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

      // CONFIGURACIONES ADMIN
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
              {menuItems.slice(1, 3).map((item) => {
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
                  HISTORIAL
                </div>
              </div>
              
              {/* Historial Section */}
              {menuItems.slice(3, 6).map((item) => {
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
              {menuItems.slice(6, 9).map((item) => {
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
              
              {/* Separator for Configuraciones Admin */}
              <div className="py-2">
                <div className="text-red-300 text-sm font-semibold px-3 py-2 bg-red-600/10 rounded">
                  CONFIGURACIONES ADMIN
                </div>
              </div>
              
              {/* Configuraciones Section */}
              {menuItems.slice(9).map((item) => {
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
                  {menuItems.find(item => item.id === activeSection)?.label}
                </h2>
                <p className="text-blue-200/70 text-sm lg:text-base">
                  {menuItems.find(item => item.id === activeSection)?.description}
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
