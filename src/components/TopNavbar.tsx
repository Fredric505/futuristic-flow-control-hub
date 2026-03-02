import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Menu, X, ChevronDown, LogOut } from 'lucide-react';

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

  const allItems = menuGroups.flatMap(g => g.items);
  const activeItem = allItems.find(i => i.id === activeSection);

  const handleSelect = (id: string) => {
    onSectionChange(id);
    setOpenDropdown(null);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Desktop Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center h-16 px-4 lg:px-6 gap-4">
          {/* Logo */}
          <h1 className="text-lg font-bold text-primary tracking-wider shrink-0">
            {title}
          </h1>

          {/* Desktop navigation */}
          <nav ref={dropdownRef} className="hidden lg:flex items-center gap-1 flex-1 ml-4">
            {menuGroups.map((group) => {
              const isGroupActive = group.items.some(i => i.id === activeSection);

              // If group has only 1 item, render as direct button
              if (group.items.length === 1) {
                const item = group.items[0];
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeSection === item.id
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
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
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isGroupActive
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    {group.label}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDropdown === group.label ? 'rotate-180' : ''}`} />
                  </button>

                  {openDropdown === group.label && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-lg shadow-xl py-1 z-50">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelect(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                              activeSection === item.id
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <div className="text-left">
                              <div className="font-medium">{item.label}</div>
                              <div className="text-xs opacity-60">{item.description}</div>
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
            className="hidden lg:flex items-center gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </Button>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden ml-auto p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-background/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="lg:hidden fixed inset-x-0 top-16 z-40 bg-card border-b border-border shadow-2xl max-h-[80vh]">
            <ScrollArea className="h-full max-h-[80vh]">
              <div className="p-4 space-y-4">
                {menuGroups.map((group) => (
                  <div key={group.label}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelect(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                              activeSection === item.id
                                ? 'bg-primary/15 text-primary font-medium'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-border">
                  <Button
                    onClick={onLogout}
                    variant="ghost"
                    className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar Sesión
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </>
  );
};

export default TopNavbar;
