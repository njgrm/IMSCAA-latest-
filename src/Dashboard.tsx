import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import headerlogo from './assets/headerlogo.png';
import headerlogoDark from './assets/headerlogoDark.png';
import Sidebar from './components/Sidebar';
import { ThemeContext } from './theme/ThemeContext';


const Dashboard: React.FC = () => {
  const { theme, setTheme } = useContext(ThemeContext);
  const isDarkMode = theme === "dark";
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);


  const username = localStorage.getItem('username') || 'User';

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
    <Sidebar />

<div className="flex-1 flex flex-col sm:ml-64">
        {/* Header */}
        <header className="relative flex items-center justify-center bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={toggleSidebar}
            className="absolute left-4 p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
            aria-label="Toggle sidebar"
          >
            {/* Hamburger icon */}
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 4h16M2 10h16M2 16h16" />
            </svg>
          </button>
          
          <h1 className="mx-auto text-xl font-semibold text-gray-900 dark:text-white">
            Welcome, {username}
            </h1>

        </header>

        {/* Main Content */}
        <main className="p-6 flex-1 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Placeholder cards */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                Total Clubs
              </h2>
              <p className="mt-2 text-3xl font-bold text-primary-600">—</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                Total Members
              </h2>
              <p className="mt-2 text-3xl font-bold text-primary-600">—</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                Upcoming Events
              </h2>
              <p className="mt-2 text-3xl font-bold text-primary-600">—</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;