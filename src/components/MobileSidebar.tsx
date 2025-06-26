
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Menu, X } from 'lucide-react';

interface MobileSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  menuItems: Array<{
    id: string;
    icon: React.ComponentType<any>;
    label: string;
    description: string;
  }>;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  title: string;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  onToggle,
  menuItems,
  activeSection,
  onSectionChange,
  onLogout,
  title
}) => {
  return (
    <>
      {/* Mobile Menu Button - Fixed position */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          onClick={onToggle}
          className="bg-black/30 backdrop-blur-xl border border-blue-500/20 text-blue-300 hover:bg-blue-600/20"
          size="sm"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={onToggle} />
      )}

      {/* Mobile Sidebar - Fixed with ScrollArea */}
      <div className={`lg:hidden fixed top-0 left-0 h-full w-80 bg-black/30 backdrop-blur-xl border-r border-blue-500/20 z-40 transform transition-transform duration-300 flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 mt-12 mb-4">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            {title}
          </h1>
        </div>
        
        {/* Scrollable Navigation */}
        <ScrollArea className="flex-1 px-6">
          <nav className="space-y-2 pb-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSectionChange(item.id);
                    onToggle();
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                    activeSection === item.id
                      ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300'
                      : 'text-blue-200/70 hover:bg-blue-600/10 hover:text-blue-300'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="font-medium text-sm truncate">{item.label}</div>
                    <div className="text-xs opacity-70 truncate">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </ScrollArea>
        
        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-6 pt-4 border-t border-blue-500/20">
          <Button 
            onClick={onLogout}
            className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30"
          >
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </>
  );
};

export default MobileSidebar;
