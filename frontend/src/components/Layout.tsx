import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-xl font-bold text-primary-600">
                QA Platform
              </Link>
              <nav className="flex space-x-4">
                <Link to="/projects" className="text-gray-700 hover:text-primary-600 font-medium">
                  Projects
                </Link>
                <Link to="/issues" className="text-gray-700 hover:text-primary-600 font-medium">
                  Issues
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <span className="text-gray-600">
                  {user?.first_name || user?.email}
                </span>
                <span className="ml-2 badge badge-new">
                  {user?.role}
                </span>
              </div>
              <button onClick={handleLogout} className="btn btn-secondary text-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          © 2025 QA Automation Platform - MVP1
        </div>
      </footer>
    </div>
  );
};

export default Layout;
