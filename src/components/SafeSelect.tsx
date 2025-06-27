
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SafeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

const SafeSelect: React.FC<SafeSelectProps> = ({ 
  value, 
  onValueChange, 
  placeholder, 
  disabled, 
  className,
  children 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className={`${className} h-10 rounded-md border border-input bg-background px-3 py-2 text-sm flex items-center`}>
        <span className="text-muted-foreground">{placeholder}</span>
      </div>
    );
  }

  return (
    <Select 
      value={value} 
      onValueChange={onValueChange}
      disabled={disabled}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {children}
      </SelectContent>
    </Select>
  );
};

export default SafeSelect;
