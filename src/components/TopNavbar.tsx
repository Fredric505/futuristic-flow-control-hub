import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Menu, X, ChevronDown, LogOut, Sparkles } from 'lucide-react';

interface MenuItem {
  id: string;
  icon: React.ComponentType<any>;
  label: string;
  description: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

interface TopNavbarProps {
  title: string;
  menuGroups: MenuGroup[];
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
}

const TopNavbar: React.FC<TopNavbarProps> = ({
  title,
  menuGroups,
  activeSection,
  onSectionChange,
  onLogout,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelect = (id: string) => {
    onSectionChange(id);
    setOpenDropdown(null);
    setMobileOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-navbar">
        <div className="max-w-7xl mx-auto flex items-center h-14 px-4 lg:px-6 gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-lg gold-gradient flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-base font-bold gold-text tracking-wider font-['Space_Grotesk']">
              {title}
            </h1>
          </div>

          {/* Desktop navigation */}
          <nav ref={dropdownRef} className="hidden lg:flex items-center gap-0.5 flex-1 ml-6">
            {menuGroups.map((group) => {
              const isGroupActive = group.items.some(i => i.id === activeSection);

              if (group.items.length === 1) {
                const item = group.items[0];
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeSection === item.id
                        ? 'bg-primary/10 text-primary glow-gold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              }

              return (
                <div key={group.label} className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === group.label ? null : group.label)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isGroupActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    }`}
                  >
                    {group.label}
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${openDropdown === group.label ? 'rotate-180' : ''}`} />
                  </button>

                  {openDropdown === group.label && (
                    <div className="absolute top-full left-0 mt-2 w-72 glass-card rounded-xl shadow-2xl py-2 z-50 animate-fade-in">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelect(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 ${
                              activeSection === item.id
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                            }`}
                          >
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              activeSection === item.id ? 'bg-primary/20' : 'bg-accent'
                            }`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium">{item.label}</div>
                              <div className="text-xs text-muted-foreground">{item.description}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Desktop logout */}
          <Button
            onClick={onLogout}
            variant="ghost"
            size="sm"
            className="hidden lg:flex items-center gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </Button>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden ml-auto p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Panel */}
          <div className="relative mt-14 mx-3 mb-3 flex-1 max-h-[calc(100vh-4.5rem)] glass-card rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {menuGroups.map((group) => (
                  <div key={group.label}>
                    <p className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.2em] px-2 mb-1.5">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelect(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                              activeSection === item.id
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                            }`}
                          >
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                              activeSection === item.id ? 'bg-primary/20' : 'bg-accent/60'
                            }`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                              <span className="block">{item.label}</span>
                              <span className="text-[11px] text-muted-foreground">{item.description}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-border/50">
                  <Button
                    onClick={onLogout}
                    variant="ghost"
                    className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <LogOut className="h-4 w-4" />
                    </div>
                    Cerrar Sesión
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </>
  );
};

export default TopNavbar;
