import React from 'react'

const Card = ({ 
  variant = 'default', 
  className = '', 
  children, 
  ...rest 
}) => {
  const variantClasses = {
    default: "bg-white rounded-xl shadow-card",
    elevated: "bg-white rounded-xl shadow-elevated",
    bordered: "bg-white rounded-xl border border-slate-200",
  }

  // Ensure p-6 is applied unless overridden by className
  const paddingClass = className.includes('p-') ? '' : 'p-6'

  return (
    <div 
      className={`${variantClasses[variant]} ${paddingClass} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

export default Card
