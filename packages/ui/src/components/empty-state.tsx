import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
      {icon && <div className="text-gray-400">{icon}</div>}
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description && <p className="max-w-md text-sm text-gray-600">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
