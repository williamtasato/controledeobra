import React from 'react';
import { STATUS_DETALHADOS } from '@shared/const';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface StatusDetailedSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  disabled?: boolean;
}

export function StatusDetailedSelector({
  value,
  onChange,
  label = 'Status',
  disabled = false
}: StatusDetailedSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um status..." />
        </SelectTrigger>
        <SelectContent>
          {STATUS_DETALHADOS.map(status => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
