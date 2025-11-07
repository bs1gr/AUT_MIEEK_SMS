import React from 'react';

// Reads version from VITE_APP_VERSION (injected at build time)
const version = import.meta.env.VITE_APP_VERSION || 'dev';

export default function Footer() {
  return (
    <footer className="w-full text-center text-xs text-gray-400 py-4 select-none">
      Student Management System &copy; {new Date().getFullYear()} Vasilis Samaras &mdash; v{version}
    </footer>
  );
}
