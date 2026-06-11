import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Navigation, Calendar, User, Clock, Search, RotateCcw, AlertTriangle } from 'lucide-react';
import apiService from '../services/api';

function Dashboard({ onTripGenerated, onSelectTrip }) {
  const [formData, setFormData] = useState({
    current_location: 'Dallas, TX',
    pickup_location: 'Oklahoma City, OK',
    dropoff_location: 'Chicago, IL',
    current_cycle_used: 10.5,
    driver_name: 'John Doe',
    truck_number: 'TRK-9080',
    date: new Date().toISOString().split('T')[0],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pastTrips, setPastTrips] = useState([]);
  const [recentSearchQuery, setRecentSearchQuery] = useState('');

  // Fetch past trips on load
  useEffect(() => {
    let cancelled = false;
    const loadTrips = async () => {
      try {
        const data = await apiService.getTrips();
        if (!cancelled) {
          setPastTrips(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching past trips:', err);
        }
      }
    };
    loadTrips();
    return () => { cancelled = true; };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const trip = await apiService.createTrip({
        ...formData,
        current_cycle_used: parseFloat(formData.current_cycle_used) || 0.0
      });
      onTripGenerated(trip);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate trip plan. Please verify the locations and parameters.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTrips = pastTrips.filter(t => 
    t.driver.name.toLowerCase().includes(recentSearchQuery.toLowerCase()) ||
    t.current_location.toLowerCase().includes(recentSearchQuery.toLowerCase()) ||
    t.dropoff_location.toLowerCase().includes(recentSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          ELD Trip Planner Dashboard
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Calculate routes, compliant HOS splits, fuel stops, and generate official FMCSA daily driver log grids.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center space-x-2">
            <Navigation className="h-5 w-5 text-blue-500" />
            <span>Generate New Trip Plan</span>
          </h3>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-xl flex items-start space-x-3 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Driver Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Driver Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    name="driver_name"
                    value={formData.driver_name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. John Doe"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                  />
                </div>
              </div>

              {/* Truck Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Truck Number
                </label>
                <div className="relative">
                  <Truck className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    name="truck_number"
                    value={formData.truck_number}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. TRK-9908"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                  />
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Trip Start Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                  />
                </div>
              </div>

              {/* Cycle Used Hours */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Current 70-Hr Cycle Used (Hours)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="70"
                    name="current_cycle_used"
                    value={formData.current_cycle_used}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-200 dark:border-slate-800" />

            <div className="space-y-4">
              {/* Current Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Current Driver Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-indigo-500" />
                  <input
                    type="text"
                    name="current_location"
                    value={formData.current_location}
                    onChange={handleInputChange}
                    required
                    placeholder="City, State"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pickup Location */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Pickup Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-emerald-500" />
                    <input
                      type="text"
                      name="pickup_location"
                      value={formData.pickup_location}
                      onChange={handleInputChange}
                      required
                      placeholder="City, State"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                    />
                  </div>
                </div>

                {/* Dropoff Location */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Dropoff Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-rose-500" />
                    <input
                      type="text"
                      name="dropoff_location"
                      value={formData.dropoff_location}
                      onChange={handleInputChange}
                      required
                      placeholder="City, State"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all duration-200 flex items-center justify-center space-x-2 text-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Calculating HOS Logs...</span>
                </>
              ) : (
                <>
                  <Navigation className="h-5 w-5 fill-white/10" />
                  <span>Generate ELD Trip Plan</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* History Column */}
        <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col h-[600px] lg:h-auto">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center space-x-2 shrink-0">
            <RotateCcw className="h-5 w-5 text-indigo-500" />
            <span>Recent Calculations</span>
          </h3>

          {/* Search bar */}
          <div className="relative mb-4 shrink-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search driver, route..."
              value={recentSearchQuery}
              onChange={(e) => setRecentSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white"
            />
          </div>

          {/* Scrollable list */}
          <div className="flex-grow overflow-y-auto space-y-3 pr-1">
            {filteredTrips.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 text-center p-4">
                <Clock className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                <p className="text-xs">No recent plans found</p>
              </div>
            ) : (
              filteredTrips.map(trip => (
                <div
                  key={trip.id}
                  onClick={() => onSelectTrip(trip)}
                  className="p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800/50 rounded-xl cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {trip.driver.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Truck: #{trip.driver.truck_number}
                      </p>
                    </div>
                    {trip.violations.length > 0 ? (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400 rounded-md border border-rose-200/50 dark:border-rose-900/50">
                        VIOLATIONS
                      </span>
                    ) : (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-md border border-emerald-200/50 dark:border-emerald-900/50">
                        COMPLIANT
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <div>
                      <strong className="text-slate-400">From:</strong> {trip.current_location.split(',')[0]}
                    </div>
                    <div>
                      <strong className="text-slate-400">To:</strong> {trip.dropoff_location.split(',')[0]}
                    </div>
                    <div>
                      <strong className="text-slate-400">Distance:</strong> {trip.total_miles.toFixed(0)} mi
                    </div>
                    <div>
                      <strong className="text-slate-400">Days:</strong> {trip.days ? trip.days.length : 0}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
