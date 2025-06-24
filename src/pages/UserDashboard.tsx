
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, FileText, History } from 'lucide-react';
import ProcessForm from '@/components/ProcessForm';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [userData, setUserData] = useState({
    processes: 0,
    messagesSent: 0,
    credits: 0
  });
  const [instanceConfig, setInstanceConfig] = useState({
    instance: '',
    token: ''
  });

  useEffect(() => {
    loadUserData();
    loadInstanceConfig();
  }, [activeSection]);

  const loadUserData = () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const userProcesses = JSON.parse(localStorage.getItem('userProcesses') || '[]');
    const userMessages = JSON.parse(localStorage.getItem('userMessages') || '[]');
    
    setUserData({
      processes: userProcesses.length,
      messagesSent: userMessages.length,
      credits: currentUser.credits || 0
    });
  };

  const loadInstanceConfig = () => {
    const instance = localStorage.getItem('systemInstance') || 'instance126876';
    const token = localStorage.getItem('systemToken') || '4ecj8581tubua7ry';
    
    setInstanceConfig({ instance, token });
  };

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard', description: 'Pantalla de inicio' },
    { id: 'add-process', icon: Plus, label: 'Agregar Proceso', description: 'Agregar formulario para luego guardar' },
    { id: 'view-processes', icon: FileText, label: 'Ver Procesos', description: 'Procesos guardados y listos para enviar' },
    { id: 'history', icon: History, label: 'Historial', description: 'Historial de mensajes enviados' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100">Mis Procesos</p>
                      <p className="text-3xl font-bold">{userData.processes}</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-600 to-green-800 text-white border-none">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100">Mensajes Enviados</p>
                      <p className="text-3xl font-bold">{userData.messagesSent}</p>
                    </div>
                    <History className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-600 to-purple-800 text-white border-none">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100">Créditos Disponibles</p>
                      <p className="text-3xl font-bold">{userData.credits}</p>
                    </div>
                    <Plus className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="bg-black/20 backdrop-blur-xl border border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-blue-300">Panel de Usuario</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-200/70">
                  Bienvenido a tu panel personal. Aquí puedes gestionar tus procesos y revisar tu historial.
                </p>
                <div className="mt-4 p-4 bg-blue-950/30 rounded-lg border border-blue-500/20">
                  <h4 className="text-blue-300 font-semibold mb-2">Configuración Actual</h4>
                  <p className="text-blue-200/70 text-sm">Instancia: {instanceConfig.instance}</p>
                  <p className="text-blue-200/70 text-sm">Token: {instanceConfig.token}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case 'add-process':
        return <ProcessForm userType="user" />;
      
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill-opacity='0.03'%3E%3Cpolygon fill='%23ffffff' points='50 0 60 40 100 50 60 60 50 100 40 60 0 50 40 40'/%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      
      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 min-h-screen bg-black/30 backdrop-blur-xl border-r border-blue-500/20 p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              PANEL USUARIO
            </h1>
            <p className="text-blue-200/70 text-sm mt-1">Sistema Ejecutivo</p>
          </div>
          
          <nav className="space-y-2">
            {menuItems.map((item) => {
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
          </nav>
          
          <div className="mt-8 pt-8 border-t border-blue-500/20">
            <Button 
              onClick={handleLogout}
              className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30"
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                {menuItems.find(item => item.id === activeSection)?.label}
              </h2>
              <p className="text-blue-200/70">
                {menuItems.find(item => item.id === activeSection)?.description}
              </p>
            </div>
            
            {renderContent()}
          </div>
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

export default UserDashboard;
