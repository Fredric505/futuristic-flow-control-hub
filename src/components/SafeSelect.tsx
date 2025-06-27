
import React, { useState, useEffect } from 'react';
import CustomSelect, { CustomSelectItem } from './CustomSelect';

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

  // Convert SelectItem children to CustomSelectItem
  const convertedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === 'div' && child.props.value) {
      return (
        <CustomSelectItem
          key={child.props.value}
          value={child.props.value}
          className={child.props.className}
          data-value={child.props.value}
        >
          {child.props.children}
        </CustomSelectItem>
      );
    }
    // Handle regular SelectItem components
    if (React.isValidElement(child) && child.props.value) {
      return (
        <div
          key={child.props.value}
          data-value={child.props.value}
          className={child.props.className}
        >
          {child.props.children}
        </div>
      );
    }
    return child;
  });

  return (
    <CustomSelect
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    >
      {convertedChildren}
    </CustomSelect>
  );
};

export default SafeSelect;
