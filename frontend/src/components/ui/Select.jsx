import React from 'react'
import { ChevronDown } from 'lucide-react'

const Select = ({ 
  label, 
  error, 
  options = [], 
  className = '', 
  ...rest 
}) => {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`
            w-full py-2 px-3 text-sm rounded-lg border outline-none transition-colors appearance-none bg-white
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100' 
              : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-slate-800'
            }
            ${className}
          `}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-0.5">{error}</p>
      )}
    </div>
  )
}

export default Select
