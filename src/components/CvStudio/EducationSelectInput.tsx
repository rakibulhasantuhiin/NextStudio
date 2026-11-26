import React, { useEffect, useState } from 'react';
import { List, Pencil } from 'lucide-react';
import type { CvOptionGroup } from '../../utils/cvTemplates';

interface EducationSelectInputProps {
  value: string;
  onChange: (nextVal: string) => void;
  groups?: CvOptionGroup[];
  flatOptions?: string[];
  lang: 'bn' | 'en';
  placeholder?: string;
  emptyOptionLabel?: string;
  autoFocus?: boolean;
  compact?: boolean;
}

export const EducationSelectInput: React.FC<EducationSelectInputProps> = ({
  value,
  onChange,
  groups,
  flatOptions,
  lang,
  placeholder,
  emptyOptionLabel,
  autoFocus = false,
  compact = false,
}) => {
  const isBn = lang === 'bn';
  const allOptions = flatOptions || (groups ? groups.flatMap((g) => g.items) : []);
  const isPresetValue = !value || allOptions.includes(value);
  const [customMode, setCustomMode] = useState<boolean>(() => !isPresetValue);

  useEffect(() => {
    if (value && !allOptions.includes(value)) {
      setCustomMode(true);
    }
  }, [value, allOptions]);

  const baseClass = compact
    ? 'w-full px-2 py-1 rounded-lg glass-input text-[11px]'
    : 'w-full px-2.5 py-2 rounded-xl glass-input text-xs sm:text-sm';

  if (customMode) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || (isBn ? 'নিজে লিখুন...' : 'Type manually...')}
          className={`${baseClass} flex-1 min-w-0`}
        />
        <button
          type="button"
          onClick={() => {
            setCustomMode(false);
            if (value && !allOptions.includes(value)) {
              onChange('');
            }
          }}
          className={`${
            compact ? 'p-1 rounded-lg' : 'p-2 rounded-xl'
          } glass-tile text-slate-600 dark:text-slate-300 hover:text-blue-600 shrink-0 cursor-pointer`}
          title={isBn ? 'তালিকা থেকে বাছুন' : 'Switch to dropdown'}
        >
          <List className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <select
        autoFocus={autoFocus}
        value={isPresetValue ? value : ''}
        onChange={(e) => {
          const val = e.target.value;
          if (val === '__CUSTOM__') {
            setCustomMode(true);
            return;
          }
          onChange(val);
        }}
        className={`${baseClass} flex-1 min-w-0 cursor-pointer bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100`}
      >
        <option value="">
          {emptyOptionLabel || (isBn ? '— বাছুন —' : '— Select —')}
        </option>
        {groups
          ? groups.map((grp) => (
              <optgroup
                key={grp.groupEn}
                label={isBn ? grp.groupBn : grp.groupEn}
              >
                {grp.items.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </optgroup>
            ))
          : allOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
        <option value="__CUSTOM__">
          {isBn ? '✎ অন্য কিছু নিজে লিখুন...' : '✎ Other / Type manually...'}
        </option>
      </select>
      <button
        type="button"
        onClick={() => setCustomMode(true)}
        className={`${
          compact ? 'p-1 rounded-lg' : 'p-2 rounded-xl'
        } glass-tile text-slate-500 dark:text-slate-400 hover:text-blue-600 shrink-0 cursor-pointer`}
        title={isBn ? 'নিজে লিখুন' : 'Type manually'}
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
};
