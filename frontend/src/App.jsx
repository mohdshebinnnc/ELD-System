import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Route, FileText, Download, Truck, Menu, X } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import TripResults from './pages/TripResults';
import DailyLogs from './pages/DailyLogs';
import PDFViewer from './pages/PDFViewer';

const NAV_ITEMS = [
  { id: 'dashboard', path: '/', label: 'Dashboard', icon: LayoutDashboard, requiresTrip: false },
  { id: 'results', path: '/results', label: 'Route & Compliance', icon: Route, requiresTrip: true },
  { id: 'logs', path: '/logs', label: 'ELD Driver Logs', icon: FileText, requiresTrip: true },
  { id: 'pdf', path: '/pdf', label: 'PDF Reports', icon: Download, requiresTrip: true },
];

// Map URL paths back to page IDs
const PATH_TO_PAGE = {
  '/': 'dashboard',
  '/results': 'results',
  '/logs': 'logs',
  '/pdf': 'pdf',
};

// Map page IDs to URL paths
const PAGE_TO_PATH = {
  dashboard: '/',
  results: '/results',
  logs: '/logs',
  pdf: '/pdf',
};

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  results: 'Route & Compliance',
  logs: 'ELD Driver Logs',
  pdf: 'PDF Reports',
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive activePage from the current URL path
  const activePage = PATH_TO_PAGE[location.pathname] || 'dashboard';

  const [selectedTripId, setSelectedTripId] = useState(null);
  const [activeTripData, setActiveTripData] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getRequiredActionsCount = (violations) => {
    if (!violations) return 0;
    return violations.filter(v => {
      if (typeof v === 'string') return true;
      return v.severity === 'amber' || v.severity === 'red';
    }).length;
  };

  const getBadgeColor = (violations) => {
    if (!violations) return 'bg-[#F59E0B]';
    const hasRed = violations.some(v => typeof v === 'object' && v.severity === 'red');
    return hasRed ? 'bg-[#DC2626]' : 'bg-[#F59E0B]';
  };

  const handleTripGenerated = (trip) => {
    setSelectedTripId(trip.id);
    setActiveTripData(trip);
    navigate('/results');
  };

  const handleLoadTrip = (trip) => {
    setSelectedTripId(trip.id);
    setActiveTripData(trip);
    navigate('/results');
  };

  const navigateTo = (pageId) => {
    navigate(PAGE_TO_PATH[pageId] || '/');
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-black flex">

      {/* ── Mobile Overlay ── */}
      {mobileMenuOpen && (
        <div className="sidebar-overlay lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen w-[260px] bg-white
        border-r border-[#F0F0F0]
        flex flex-col shrink-0 transition-transform duration-200
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo — flows naturally, no boxed divider */}
        <div className="h-[72px] px-6 flex items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#191970] rounded-xl flex items-center justify-center">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-black tracking-tight leading-tight">
                ELD Trip Planner
              </h1>
              <p className="text-[11px] text-[#9CA3AF] font-medium">HOS Compliance System</p>
            </div>
          </div>
        </div>

        {/* Navigation — borderless links, generous spacing */}
        <nav className="flex-1 px-3 pt-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isDisabled = item.requiresTrip && !selectedTripId;
            const isActive = activePage === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => !isDisabled && navigateTo(item.id)}
                disabled={isDisabled}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium
                  transition-all duration-150 cursor-pointer
                  ${isDisabled ? 'opacity-35 cursor-not-allowed' : ''}
                  ${isActive
                    ? 'bg-[#191970] text-white'
                    : 'text-[#4B5563] hover:bg-[#F9FAFB] hover:text-black'
                  }
                `}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
                {item.id === 'results' && getRequiredActionsCount(activeTripData?.violations) > 0 && (
                  <span className={`ml-auto w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${getBadgeColor(activeTripData.violations)}`}>
                    {getRequiredActionsCount(activeTripData.violations)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Status — flows naturally, no boxed divider */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="h-2 w-2 rounded-full bg-[#16A34A]"></span>
            <span className="text-[12px] font-semibold text-black">System Connected</span>
          </div>
          <p className="text-[11px] text-[#9CA3AF] pl-4">
            FMCSA Part 395 · v1.1
          </p>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar — borderless, seamless */}
        <header className="h-[72px] bg-white px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-[#F9FAFB] transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5 text-[#374151]" /> : <Menu className="h-5 w-5 text-[#374151]" />}
            </button>
            <h2 className="text-[20px] font-semibold text-black">
              {PAGE_TITLES[activePage]}
            </h2>
          </div>

          {activeTripData && (
            <div className="hidden sm:flex items-center gap-5 text-[13px]">
              <div className="flex items-center gap-1.5">
                <span className="text-[#9CA3AF] font-medium">Driver</span>
                <span className="font-semibold text-black">{activeTripData.driver.name}</span>
              </div>
              <div className="h-4 w-px bg-[#E5E7EB]"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#9CA3AF] font-medium">Truck</span>
                <span className="font-semibold text-black">#{activeTripData.driver.truck_number}</span>
              </div>
            </div>
          )}
        </header>

        {/* Page Content */}
        <div className="flex-grow p-6 bg-[#FAFAFA] overflow-y-auto">
          <div className="animate-fade-in">
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
        </div>
      </main>
    </div>
  );
}

export default App;
