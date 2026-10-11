'use client';

import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../lib/cn';

export type InputSize = 'sm' | 'md' | 'lg';

const baseClasses =
  'block w-full rounded-md border bg-white text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-0 disabled:cursor-not-allowed disabled:bg-gray-50';

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-3 text-sm',
  lg: 'h-12 px-4 text-base',
};

const stateClasses = {
  default: 'border-gray-300 focus:border-brand-primary',
  error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
};

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  inputSize?: InputSize;
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { inputSize = 'md', hasError = false, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        baseClasses,
        sizeClasses[inputSize],
        hasError ? stateClasses.error : stateClasses.default,
        className,
      )}
      {...props}
    />
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { hasError = false, className, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        baseClasses,
        'min-h-20 py-2',
        hasError ? stateClasses.error : stateClasses.default,
        className,
      )}
      {...props}
    />
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { hasError = false, className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        baseClasses,
        sizeClasses.md,
        hasError ? stateClasses.error : stateClasses.default,
        'pr-8',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
