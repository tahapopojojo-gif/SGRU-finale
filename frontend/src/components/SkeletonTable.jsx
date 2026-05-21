import React from 'react';
import SkeletonLoader from './SkeletonLoader.jsx';

export const SkeletonTable = ({ rows = 5, columns = 5 }) => {
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse'
  };

  const rowStyle = {
    borderBottom: '1px solid rgba(242, 237, 230, 0.08)'
  };

  const cellStyle = {
    padding: '16px 8px'
  };

  return (
    <table style={tableStyle}>
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex} style={rowStyle}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <td key={colIndex} style={cellStyle}>
                <SkeletonLoader width="90%" height="16px" marginBottom="0" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default SkeletonTable;
