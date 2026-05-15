import React from 'react';


export default function NavButton({ children, onClick, active }) {
return (
<button
onClick={onClick}
className={`px-3 py-1 rounded text-sm ${
active ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-indigo-600'
}`}
>
{children}
</button>
);
}