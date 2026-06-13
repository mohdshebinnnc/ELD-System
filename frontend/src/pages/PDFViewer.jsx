import React, { useState, useEffect } from 'react';
import { Download, FileText, ShieldCheck, Printer, FileDown, Loader2, Info } from 'lucide-react';
import apiService from '../services/api';

function PDFViewer({ tripId }) {
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPdf = async () => {
      setLoading(true);
      try {
        const data = await apiService.getTripPdf(tripId);
        setPdfUrl(data.pdf_url);
      } catch (err) {
        console.error('Error fetching PDF url:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPdf();
  }, [tripId]);

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 text-[#191970] animate-spin" />
        <span className="text-[14px] text-[#6B7280] font-medium">Generating PDF report...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto flex flex-col h-[calc(100vh-10rem)]">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <p className="text-[14px] text-[#6B7280]">
          Print, sign, and store your official HOS trip compliance summary sheet.
        </p>
        {pdfUrl && (
          <a
            href={pdfUrl}
            download={`hos_trip_${tripId}_logs.pdf`}
            className="inline-flex items-center gap-2 bg-[#191970] hover:bg-[#2E3A8C] text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer shrink-0"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF Report</span>
          </a>
        )}
      </div>

      {/* ── Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 flex-grow min-h-0">

        {/* Left: Info Cards */}
        <div className="lg:col-span-1 space-y-5 shrink-0">

          {/* PDF Contents */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
            <h3 className="text-[14px] font-semibold text-black flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#6B7280]" />
              <span>PDF Package Includes</span>
            </h3>
            <ul className="space-y-2.5 text-[13px] text-[#374151]">
              {[
                'Itinerary & Mileage Summary',
                'Detailed Route Coordinates',
                'Compliance & HOS Action Schedule',
                'Pillow-Drawn Daily Grid Sheets',
                'Auto-compiled Remarks & Signposts',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#191970] shrink-0"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Compliance Badge */}
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#16A34A]" />
              <h4 className="text-[13px] font-semibold text-[#166534]">FMCSA Compliance</h4>
            </div>
            <p className="text-[12px] text-[#15803D] leading-relaxed">
              This log set meets standard 70-hour / 8-day duty conditions for property-carrying drivers. Ensure to keep signature copies filed in your safety management files.
            </p>
          </div>
        </div>

        {/* Right: PDF Viewer */}
        <div className="lg:col-span-3 bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col min-h-[400px]">
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <Printer className="h-4 w-4 text-[#6B7280]" />
            <h3 className="text-[14px] font-semibold text-black">Document Viewer</h3>
          </div>

          <div className="flex-grow bg-[#F8FAFC] rounded-xl overflow-hidden border border-[#E5E7EB] relative">
            {pdfUrl ? (
              <object
                data={pdfUrl}
                type="application/pdf"
                className="w-full h-full"
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-4">
                  <FileDown className="h-10 w-10 text-[#9CA3AF]" />
                  <div>
                    <h4 className="text-[14px] font-semibold text-black">Browser Preview Unavailable</h4>
                    <p className="text-[13px] text-[#6B7280] mt-1">Your browser doesn't support embedded PDF previews. Click download to save locally.</p>
                  </div>
                  <a
                    href={pdfUrl}
                    download={`hos_trip_${tripId}_logs.pdf`}
                    className="bg-[#191970] hover:bg-[#2E3A8C] text-white px-4 py-2 rounded-xl text-[13px] font-semibold cursor-pointer transition-colors"
                  >
                    Download PDF Report
                  </a>
                </div>
              </object>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[#9CA3AF]">
                <Info className="h-8 w-8" />
                <span className="text-[13px] mt-2">No PDF compiled for preview.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PDFViewer;
