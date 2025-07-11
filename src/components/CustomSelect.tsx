
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const CustomSelectItem: React.FC<SelectItemProps> = ({ value, children, className }) => {
  return (
    <div data-value={value} className={className}>
      {children}
    </div>
  );
};

const CustomSelect: React.FC<CustomSelectProps> = ({ 
  value, 
  onValueChange, 
  placeholder, 
  disabled, 
  className,
  children 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Find the selected item's label
    if (value && containerRef.current) {
      const items = containerRef.current.querySelectorAll('[data-value]');
      items.forEach((item) => {
        if (item.getAttribute('data-value') === value) {
          setSelectedLabel(item.textContent || '');
        }
      });
    } else {
      setSelectedLabel('');
    }
  }, [value, children]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleItemClick = (itemValue: string, itemLabel: string) => {
    onValueChange(itemValue);
    setSelectedLabel(itemLabel);
    setIsOpen(false);
  };

  const renderItems = (children: React.ReactNode): JSX.Element[] => {
    return React.Children.map(children, (child) => {
      if (React.isValidElement(child) && child.props['data-value']) {
        const itemValue = child.props['data-value'];
        const itemLabel = child.props.children;
        const isSelected = value === itemValue;
        
        return (
          <div
            key={itemValue}
            className={cn(
              "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
              child.props.className,
              isSelected && "bg-accent"
            )}
            onClick={() => handleItemClick(itemValue, itemLabel)}
          >
            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
              {isSelected && <Check className="h-4 w-4" />}
            </span>
            <span>{itemLabel}</span>
          </div>
        );
      }
      return null;
    }).filter(Boolean) as JSX.Element[];
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedLabel ? "" : "text-muted-foreground"}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      
      {isOpen && (
        <>
          {/* Overlay backdrop */}
          <div 
            className="fixed inset-0 z-[999]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown content */}
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 z-[1000] mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
            style={{ 
              minWidth: '8rem', 
              maxHeight: '24rem', 
              overflowY: 'auto',
              position: 'absolute',
              zIndex: 1000
            }}
          >
            <div className="p-1">
              {renderItems(children)}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomSelect;
