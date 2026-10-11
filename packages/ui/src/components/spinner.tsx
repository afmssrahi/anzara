'use client';

import { cn } from '../lib/cn';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-4',
};

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label ?? 'Loading'}
      className={cn(
        'inline-block animate-spin rounded-full border-current border-t-transparent text-brand-primary',
        sizeClasses[size],
        className,
      )}
    />
  );
}

export function LoadingScreen({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-gray-500">
      <Spinner size="lg" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
