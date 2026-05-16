import React from 'react'

const Tooltip = ({ 
  content, 
  children, 
  position = 'top' 
}) => {
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1",
    left: "right-full top-1/2 -translate-y-1/2 mr-1",
    right: "left-full top-1/2 -translate-y-1/2 ml-1",
  }

  return (
    <div className="relative inline-flex group">
      {children}
      <div 
        className={`
          absolute z-50 px-2 py-1 text-xs text-white bg-slate-800 rounded-md whitespace-nowrap 
          pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150
          ${positionClasses[position]}
        `}
      >
        {content}
      </div>
    </div>
  )
}

export default Tooltip
