import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Trash2, Info } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  title = '¿Estás seguro?',
  description = 'Esta acción no se puede deshacer.',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
}) => {
  const iconMap = {
    danger: <Trash2 className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
  };

  const colorMap = {
    danger: {
      iconBg: 'bg-destructive/15',
      iconText: 'text-destructive',
      button: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
    },
    warning: {
      iconBg: 'bg-warning/15',
      iconText: 'text-warning',
      button: 'bg-warning hover:bg-warning/90 text-warning-foreground',
    },
    info: {
      iconBg: 'bg-info/15',
      iconText: 'text-info',
      button: 'bg-info hover:bg-info/90 text-info-foreground',
    },
  };

  const colors = colorMap[variant];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass-card border-border/50 max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl ${colors.iconBg} ${colors.iconText} flex items-center justify-center shrink-0 mt-0.5`}>
              {iconMap[variant]}
            </div>
            <div>
              <AlertDialogTitle className="text-foreground font-['Space_Grotesk'] text-lg">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2 gap-2 sm:gap-2">
          <AlertDialogCancel className="bg-secondary/60 border-border/40 text-foreground hover:bg-secondary">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={colors.button}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
