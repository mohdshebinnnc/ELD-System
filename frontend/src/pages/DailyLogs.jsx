import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, ListChecks, FileImage, ExternalLink } from 'lucide-react';
import apiService from '../services/api';

function DailyLogs({ tripId, tripData }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const data = await apiService.getTripLogs(tripId);
        if (!cancelled) {
          setLogs(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching daily logs:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    fetchLogs();
    return () => { cancelled = true; };
  }, [tripId]);

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-3">
        <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-500 font-semibold text-sm">Loading daily driver logs...</span>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <p className="text-slate-400 text-sm">No driver logs found for this trip.</p>
      </div>
    );
  }

  const activeDay = logs[selectedDayIdx];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Daily Driver Logs
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Official FMCSA paper-style logs drawn dynamically with Python Pillow for each 24-hour cycle.
          </p>
        </div>

        {activeDay?.pdf_url && (
          <a
            href={activeDay.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-md text-sm font-semibold transition-all cursor-pointer"
          >
            <span>Download All Logs (PDF)</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* Day Selector Tabs */}
      <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-thin shrink-0">
        {logs.map((log, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedDayIdx(idx)}
            className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
              selectedDayIdx === idx
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md'
                : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex flex-col items-start">
              <span className="text-[10px] uppercase opacity-70">Day {log.day_number}</span>
              <span className="text-xs mt-0.5">{log.date}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Active Day Logs Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pillow Drawn Grid PNG */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
              <FileImage className="h-5 w-5 text-blue-500" />
              <span>Drawn Log Sheet Grid (Day {activeDay.day_number})</span>
            </h3>
            {activeDay.image_url && (
              <a
                href={activeDay.image_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center space-x-1"
              >
                <span>View Full Size</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <div className="bg-slate-100 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800/80 flex items-center justify-center overflow-hidden">
            {activeDay.image_url ? (
              <img
                src={activeDay.image_url}
                alt={`Driver log sheet for day ${activeDay.day_number}`}
                className="max-w-full h-auto rounded-lg shadow-sm border border-slate-200 dark:border-slate-800"
              />
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                Log sheet image is not available.
              </div>
            )}
          </div>
        </div>

        {/* Daily Metrics and Remarks */}
        <div className="space-y-6">
          {/* Daily Totals Widget */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
              <Clock className="h-5 w-5 text-indigo-500" />
              <span>Daily HOS Breakdowns</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Driving Hours</p>
                <h4 className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
                  {activeDay.driving_hours.toFixed(1)} hrs
                </h4>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">On-Duty Hours</p>
                <h4 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {activeDay.duty_hours.toFixed(1)} hrs
                </h4>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Sleeper / Rest Hours</p>
                <h4 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {activeDay.rest_hours.toFixed(1)} hrs
                </h4>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Log Balance</p>
                <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  24.0 hrs
                </h4>
              </div>
            </div>
          </div>

          {/* Remarks Table Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
              <ListChecks className="h-5 w-5 text-indigo-500" />
              <span>Remarks & Signposts</span>
            </h3>

            <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1">
              {activeDay.remarks?.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No remarks recorded for this day.</p>
              ) : (
                activeDay.remarks.map((rem, rIdx) => (
                  <div key={rIdx} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50 rounded-xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded">
                        {rem.time}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center">
                        <MapPin className="h-3 w-3 shrink-0 mr-0.5" />
                        {rem.location.split(',')[0]}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {rem.remark}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DailyLogs;
