import React from 'react';
import SkeletonLoader from './SkeletonLoader.jsx';

export const SkeletonChart = ({ type = 'bar', height = 300, count = 5 }) => {
  const containerStyle = {
    height: `${height}px`,
    width: '100%',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    padding: '20px',
    boxSizing: 'border-box'
  };

  if (type === 'pie') {
    return (
      <div style={{ ...containerStyle, alignItems: 'center', justifyContent: 'center' }}>
        <SkeletonLoader width={`${height * 0.8}px`} height={`${height * 0.8}px`} borderRadius="50%" marginBottom="0" />
      </div>
    );
  }

  if (type === 'bar') {
    const defaultHeights = ['40%', '80%', '60%', '90%', '50%', '75%', '30%', '85%', '45%', '65%'];
    return (
      <div style={containerStyle}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonLoader 
            key={i}
            width={`${80 / count}%`}
            height={defaultHeights[i % defaultHeights.length]}
            marginBottom="0"
          />
        ))}
      </div>
    );
  }

  if (type === 'area' || type === 'line') {
    return (
      <div style={{ ...containerStyle, alignItems: 'center', justifyContent: 'center' }}>
         <SkeletonLoader width="100%" height="80%" borderRadius="12px" marginBottom="0" />
      </div>
    );
  }

  return null;
};

export default SkeletonChart;
