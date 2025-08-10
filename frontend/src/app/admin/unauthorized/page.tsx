'use client';

import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';

export default function UnauthorizedPage() {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 p-3 rounded-full">
              <i className="fas fa-exclamation-triangle text-3xl text-red-600"></i>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You don't have permission to access this area
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <p className="text-gray-700 mb-6">
              This area is restricted to administrators only. Please contact your system administrator if you believe this is an error.
            </p>
            
            <div className="space-y-4">
              <Link
                href="/admin/login"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <i className="fas fa-sign-in-alt mr-2"></i>
                Try Different Account
              </Link>
              
              <button
                onClick={handleLogout}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            © 2024 WhatsApp Enterprise. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
} 