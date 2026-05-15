import React from 'react';

export default function DirectContactCard({ title, children }) {
  return (
    <div className="bg-white rounded shadow p-4">
      <h4 className="font-semibold mb-2">{title}</h4>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  );
}
