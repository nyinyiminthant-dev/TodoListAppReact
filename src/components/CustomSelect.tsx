import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label?: string;
  className?: string;
  size?: 'default' | 'sm';
}

export default function CustomSelect({ value, onChange, options, label, className = '', size = 'default' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  const sizeClasses = size === 'sm' ? 'text-xs py-1.5' : 'py-2';

  return (
    <div className={`relative ${className}`} ref={ref}>
      {label && <label className={`text-xs font-medium text-slate-400 block mb-1.5 ${size === 'sm' ? 'text-xs' : ''}`}>{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`input w-full flex items-center justify-between cursor-pointer text-left ${sizeClasses}`}
      >
        <span className={selectedOption ? 'text-white' : 'text-slate-400'}>
          {selectedOption?.label || 'Select...'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 py-1 rounded-xl bg-slate-800 border border-white/10 shadow-xl overflow-hidden">
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                option.value === value
                  ? 'bg-violet-500/30 text-violet-300'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
