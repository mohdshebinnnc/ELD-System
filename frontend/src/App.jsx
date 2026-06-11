import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Route, FileText, Download, Moon, Sun, Truck, ShieldAlert } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import TripResults from './pages/TripResults';
import DailyLogs from './pages/DailyLogs';
import PDFViewer from './pages/PDFViewer';

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [activeTripData, setActiveTripData] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Apply dark mode class to HTML element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleTripGenerated = (trip) => {
    setSelectedTripId(trip.id);
    setActiveTripData(trip);
    setActivePage('results');
  };

  const handleLoadTrip = (trip) => {
    setSelectedTripId(trip.id);
    setActiveTripData(trip);
    setActivePage('results');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0">
        {/* Logo and Brand */}
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <Truck className="h-8 w-8 text-blue-500 animate-pulse" />
          <div>
            <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              HOS TRIP PLANNER
            </h1>
            <p className="text-xs text-slate-400">ELD Log Sheet Generator</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActivePage('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
              activePage === 'dashboard'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => selectedTripId && setActivePage('results')}
            disabled={!selectedTripId}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
              !selectedTripId ? 'opacity-40 cursor-not-allowed' : ''
            } ${
              activePage === 'results'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Route className="h-5 w-5" />
              <span>Route & Compliance</span>
            </div>
            {activeTripData?.violations?.length > 0 && (
              <ShieldAlert className="h-4 w-4 text-rose-500 fill-rose-500/10 animate-bounce" />
            )}
          </button>

          <button
            onClick={() => selectedTripId && setActivePage('logs')}
            disabled={!selectedTripId}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
              !selectedTripId ? 'opacity-40 cursor-not-allowed' : ''
            } ${
              activePage === 'logs'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <FileText className="h-5 w-5" />
            <span>ELD Driver Logs</span>
          </button>

          <button
            onClick={() => selectedTripId && setActivePage('pdf')}
            disabled={!selectedTripId}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
              !selectedTripId ? 'opacity-40 cursor-not-allowed' : ''
            } ${
              activePage === 'pdf'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Download className="h-5 w-5" />
            <span>Download PDF</span>
          </button>
        </nav>

        {/* Footer info & Dark Mode toggler */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            <p>ELD Compliance v1.1</p>
            <p className="text-[10px] text-slate-500">FMCSA Part 395</p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 bg-slate-800 hover:bg-slate-700 hover:text-slate-100 rounded-lg transition-colors"
            title="Toggle theme"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 glass-panel sticky top-0 z-40 bg-white/70 dark:bg-slate-950/70">
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
              ELD System Status: Connected
            </span>
          </div>
          {activeTripData && (
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center space-x-4">
              <span>Driver: <strong className="text-slate-900 dark:text-slate-50">{activeTripData.driver.name}</strong></span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
              <span className="hidden sm:inline">Truck: <strong className="text-slate-900 dark:text-slate-50">#{activeTripData.driver.truck_number}</strong></span>
            </div>
          )}
        </header>

        {/* Rendering Subpages */}
        <div className="flex-grow p-6">
          {activePage === 'dashboard' && (
            <Dashboard onTripGenerated={handleTripGenerated} onSelectTrip={handleLoadTrip} />
          )}
          {activePage === 'results' && selectedTripId && (
            <TripResults tripId={selectedTripId} tripData={activeTripData} />
          )}
          {activePage === 'logs' && selectedTripId && (
            <DailyLogs tripId={selectedTripId} tripData={activeTripData} />
          )}
          {activePage === 'pdf' && selectedTripId && (
            <PDFViewer tripId={selectedTripId} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
