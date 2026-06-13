import React, { useState, useEffect } from 'react';
import { Clock, Search, AlertTriangle, Loader2 } from 'lucide-react';
import apiService from '../services/api';

function Dashboard({ onTripGenerated, onSelectTrip }) {
  const hasRedViolations = (violations) => {
    if (!violations) return false;
    return violations.some(v => typeof v === 'object' && v.severity === 'red');
  };

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
    <div className="space-y-6 max-w-[1200px] mx-auto">

      {/* ── Trip Planning Form ── */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 md:p-8">
        <h3 className="text-[20px] font-semibold text-black mb-6">Plan New Trip</h3>

        {error && (
          <div className="mb-6 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-start gap-3 text-[14px] text-[#DC2626]">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Driver info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[12px] font-medium text-[#6B7280] mb-1.5">Driver Name</label>
              <input
                type="text"
                name="driver_name"
                value={formData.driver_name}
                onChange={handleInputChange}
                required
                placeholder="e.g. John Doe"
                className="w-full h-[48px] bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl px-4 text-[14px] text-black placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#191970]/20 focus:border-[#191970] transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#6B7280] mb-1.5">Truck Number</label>
              <input
                type="text"
                name="truck_number"
                value={formData.truck_number}
                onChange={handleInputChange}
                required
                placeholder="e.g. TRK-9908"
                className="w-full h-[48px] bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl px-4 text-[14px] text-black placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#191970]/20 focus:border-[#191970] transition-all"
              />
            </div>
          </div>

          {/* Row 2: Date + Cycle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[12px] font-medium text-[#6B7280] mb-1.5">Trip Start Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
                className="w-full h-[48px] bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl px-4 text-[14px] text-black focus:outline-none focus:ring-2 focus:ring-[#191970]/20 focus:border-[#191970] transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#6B7280] mb-1.5">Current 70-Hr Cycle Used (Hours)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="70"
                name="current_cycle_used"
                value={formData.current_cycle_used}
                onChange={handleInputChange}
                required
                className="w-full h-[48px] bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl px-4 text-[14px] text-black focus:outline-none focus:ring-2 focus:ring-[#191970]/20 focus:border-[#191970] transition-all"
              />
            </div>
          </div>

          <div className="h-px bg-[#E5E7EB]"></div>

          {/* Row 3: Locations */}
          <div>
            <label className="block text-[12px] font-medium text-[#6B7280] mb-1.5">Current Driver Location</label>
            <input
              type="text"
              name="current_location"
              value={formData.current_location}
              onChange={handleInputChange}
              required
              placeholder="City, State"
              className="w-full h-[48px] bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl px-4 text-[14px] text-black placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#191970]/20 focus:border-[#191970] transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[12px] font-medium text-[#6B7280] mb-1.5">Pickup Location</label>
              <input
                type="text"
                name="pickup_location"
                value={formData.pickup_location}
                onChange={handleInputChange}
                required
                placeholder="City, State"
                className="w-full h-[48px] bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl px-4 text-[14px] text-black placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#191970]/20 focus:border-[#191970] transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#6B7280] mb-1.5">Dropoff Location</label>
              <input
                type="text"
                name="dropoff_location"
                value={formData.dropoff_location}
                onChange={handleInputChange}
                required
                placeholder="City, State"
                className="w-full h-[48px] bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl px-4 text-[14px] text-black placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#191970]/20 focus:border-[#191970] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[48px] bg-[#191970] hover:bg-[#2E3A8C] text-white font-semibold rounded-xl transition-colors duration-150 flex items-center justify-center gap-2 text-[14px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating Trip Plan...</span>
              </>
            ) : (
              <span>Generate ELD Trip Plan</span>
            )}
          </button>
        </form>
      </div>

      {/* ── Recent Trips ── */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h3 className="text-[20px] font-semibold text-black">Recent Calculations</h3>
          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search driver, route..."
              value={recentSearchQuery}
              onChange={(e) => setRecentSearchQuery(e.target.value)}
              className="w-full h-[40px] bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg pl-9 pr-3 text-[13px] text-black placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#191970]/10 focus:border-[#191970] transition-all"
            />
          </div>
        </div>

        {filteredTrips.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="h-8 w-8 text-[#D1D5DB] mx-auto mb-2" />
            <p className="text-[13px] text-[#9CA3AF]">No recent plans found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="pb-3 text-[12px] font-medium text-[#6B7280]">Driver</th>
                  <th className="pb-3 text-[12px] font-medium text-[#6B7280]">Route</th>
                  <th className="pb-3 text-[12px] font-medium text-[#6B7280] text-right">Distance</th>
                  <th className="pb-3 text-[12px] font-medium text-[#6B7280] text-right">Days</th>
                  <th className="pb-3 text-[12px] font-medium text-[#6B7280] text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map(trip => (
                  <tr
                    key={trip.id}
                    onClick={() => onSelectTrip(trip)}
                    className="border-b border-[#F3F4F6] hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                  >
                    <td className="py-3.5">
                      <p className="text-[14px] font-medium text-black">{trip.driver.name}</p>
                      <p className="text-[12px] text-[#6B7280]">#{trip.driver.truck_number}</p>
                    </td>
                    <td className="py-3.5">
                      <p className="text-[13px] text-black">{trip.current_location.split(',')[0]}</p>
                      <p className="text-[12px] text-[#6B7280]">→ {trip.dropoff_location.split(',')[0]}</p>
                    </td>
                    <td className="py-3.5 text-right">
                      <span className="text-[14px] font-medium text-black">{trip.total_miles.toFixed(0)} mi</span>
                    </td>
                    <td className="py-3.5 text-right">
                      <span className="text-[14px] font-medium text-black">{trip.days ? trip.days.length : 0}</span>
                    </td>
                    <td className="py-3.5 text-right">
                      {hasRedViolations(trip.violations) ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                          Violations
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]">
                          Compliant
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
