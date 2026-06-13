import React, { useState, useEffect } from 'react';
import { Clock, MapPin, ListChecks, ExternalLink, FileImage, Download, Loader2 } from 'lucide-react';
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
      <div className="h-64 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 text-[#191970] animate-spin" />
        <span className="text-[14px] text-[#6B7280] font-medium">Loading daily driver logs...</span>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-12 text-center bg-white border border-[#E5E7EB] rounded-xl">
        <p className="text-[14px] text-[#9CA3AF]">No driver logs found for this trip.</p>
      </div>
    );
  }

  const activeDay = logs[selectedDayIdx];

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">

      {/* ── Header + Download ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <p className="text-[14px] text-[#6B7280]">
            Official FMCSA paper-style logs drawn dynamically with Python Pillow for each 24-hour cycle.
          </p>
        </div>
        {activeDay?.pdf_url && (
          <a
            href={activeDay.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#191970] hover:bg-[#2E3A8C] text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer shrink-0"
          >
            <Download className="h-4 w-4" />
            <span>Download All Logs (PDF)</span>
          </a>
        )}
      </div>

      {/* ── Day Selector ── */}
      <div className="flex overflow-x-auto gap-2 pb-1 shrink-0">
        {logs.map((log, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedDayIdx(idx)}
            className={`px-4 py-2.5 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all duration-150 cursor-pointer border ${
              selectedDayIdx === idx
                ? 'bg-[#191970] text-white border-[#191970]'
                : 'bg-white text-[#374151] border-[#E5E7EB] hover:bg-[#F8FAFC]'
            }`}
          >
            <span className="block text-[10px] uppercase opacity-70 mb-0.5">Day {log.day_number}</span>
            <span className="block text-[12px]">{log.date}</span>
          </button>
        ))}
      </div>

      {/* ── Log Viewer + Metrics (70/30) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-5">

        {/* Left: Log Sheet Viewer */}
        <div className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[16px] font-semibold text-black flex items-center gap-2">
              <FileImage className="h-5 w-5 text-[#6B7280]" />
              <span>Log Sheet — Day {activeDay.day_number}</span>
            </h3>
            {activeDay.image_url && (
              <a
                href={activeDay.image_url}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] text-[#191970] font-medium hover:underline flex items-center gap-1"
              >
                <span>View Full Size</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EB] flex items-center justify-center overflow-hidden">
            {activeDay.image_url ? (
              <img
                src={activeDay.image_url}
                alt={`Driver log sheet for day ${activeDay.day_number}`}
                className="max-w-full h-auto rounded-lg shadow-sm border border-[#E5E7EB]"
              />
            ) : (
              <div className="py-12 text-center text-[#9CA3AF] text-[13px]">
                Log sheet image is not available.
              </div>
            )}
          </div>
        </div>

        {/* Right: Metrics + Remarks */}
        <div className="lg:col-span-3 space-y-5">

          {/* Daily Totals */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
            <h3 className="text-[14px] font-semibold text-black flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#6B7280]" />
              <span>Daily Summary</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl px-3 py-3">
                <p className="text-[11px] text-[#6B7280] font-medium">Driving</p>
                <p className="text-[20px] font-bold text-[#2563EB] mt-0.5">{activeDay.driving_hours.toFixed(1)}h</p>
              </div>
              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl px-3 py-3">
                <p className="text-[11px] text-[#6B7280] font-medium">On-Duty</p>
                <p className="text-[20px] font-bold text-[#F59E0B] mt-0.5">{activeDay.duty_hours.toFixed(1)}h</p>
              </div>
              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl px-3 py-3">
                <p className="text-[11px] text-[#6B7280] font-medium">Rest / Sleeper</p>
                <p className="text-[20px] font-bold text-[#191970] mt-0.5">{activeDay.rest_hours.toFixed(1)}h</p>
              </div>
              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl px-3 py-3">
                <p className="text-[11px] text-[#6B7280] font-medium">Total</p>
                <p className="text-[20px] font-bold text-[#16A34A] mt-0.5">24.0h</p>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-3">
            <h3 className="text-[14px] font-semibold text-black flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-[#6B7280]" />
              <span>Remarks</span>
            </h3>

            <div className="space-y-2.5 overflow-y-auto max-h-[240px] pr-1">
              {activeDay.remarks?.length === 0 ? (
                <p className="text-[13px] text-[#9CA3AF] text-center py-4">No remarks recorded for this day.</p>
              ) : (
                activeDay.remarks.map((rem, rIdx) => (
                  <div key={rIdx} className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl px-3 py-2.5 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-mono font-semibold text-[#191970] bg-[#EEF2FF] px-1.5 py-0.5 rounded">
                        {rem.time}
                      </span>
                      <span className="text-[10px] text-[#6B7280] flex items-center gap-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {rem.location.split(',')[0]}
                      </span>
                    </div>
                    <p className="text-[12px] font-medium text-[#374151]">{rem.remark}</p>
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
