import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const adminPages = [
    { path: '/admin/permissions', label: 'Permissions' },
    { path: '/admin/import-export', label: 'Import/Export' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Admin Navigation Tabs */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="flex space-x-8">
          {adminPages.map((page) => (
            <button
              key={page.path}
              onClick={() => navigate(page.path)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                isActive(page.path)
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {page.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Page Content */}
      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
