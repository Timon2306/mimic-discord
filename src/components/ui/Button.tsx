import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variants = {
      primary:
        'bg-discord hover:bg-discord-hover text-white shadow-lg shadow-discord/25 focus:ring-discord/50 hover:shadow-discord/40',
      secondary:
        'bg-surface-100 hover:bg-surface-50 text-foreground border border-border focus:ring-white/20',
      danger:
        'bg-discord-red/90 hover:bg-discord-red text-white shadow-lg shadow-discord-red/25 focus:ring-discord-red/50',
      warning:
        'bg-amber-500/90 hover:bg-amber-500 text-black font-semibold shadow-lg shadow-amber-500/25 focus:ring-amber-500/50',
      outline:
        'border border-border hover:bg-surface-100 text-foreground focus:ring-white/20',
      ghost:
        'hover:bg-surface-100 text-neutral-300 hover:text-white',
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-6 py-2.5 gap-2.5',
      icon: 'p-2 w-9 h-9',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
