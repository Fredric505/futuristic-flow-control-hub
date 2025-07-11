
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

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
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
    if (React.isValidElement<SelectItemProps>(child)) {
      const childProps = child.props as SelectItemProps;
      
      if (childProps.value) {
        return (
          <CustomSelectItem
            key={childProps.value}
            value={childProps.value}
            className={childProps.className}
            data-value={childProps.value}
          >
            {childProps.children}
          </CustomSelectItem>
        );
      }
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
