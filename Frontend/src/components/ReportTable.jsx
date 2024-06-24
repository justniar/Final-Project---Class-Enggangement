import React from 'react';

const ReportTable = ({ predictions }) => {
  return (
    <table className="bg-white p-4 rounded shadow-md">
      <thead>
        <tr>
          <th className="px-2 py-1">User</th>
          <th className="px-2 py-1">Expression</th>
          <th className="px-2 py-1">Time</th>
        </tr>
      </thead>
      <tbody>
        {predictions.map((prediction, index) => (
          <tr key={index} className={`${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'} hover:bg-gray-200`}>
            <td className="px-2 py-1">{prediction.user}</td>
            <td className="px-2 py-1">{prediction.expression}</td>
            <td className="px-2 py-1">{prediction.time}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ReportTable;
