import React, { useState, useEffect } from 'react';
import { Download, FileText, Info, ShieldCheck, Printer, FileDown } from 'lucide-react';
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
      <div className="h-64 flex flex-col items-center justify-center space-y-3">
        <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-500 font-semibold text-sm">Generating PDF compilation report...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Downloadable PDF Logs
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Print, sign, and store your official HOS trip compliance summary sheet.
          </p>
        </div>

        {pdfUrl && (
          <a
            href={pdfUrl}
            download={`hos_trip_${tripId}_logs.pdf`}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-3 rounded-xl shadow-lg hover:shadow-blue-500/20 text-sm font-bold transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download Compliant PDF Logs</span>
          </a>
        )}
      </div>

      {/* Grid Layout: Left Info Card, Right PDF Iframe Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow min-h-0">
        {/* Info Column */}
        <div className="lg:col-span-1 space-y-6 shrink-0">
          {/* Summary Package Description */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center space-x-2">
              <FileText className="h-5 w-5 text-indigo-500" />
              <span>PDF Logs Package Includes:</span>
            </h3>
            
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 font-semibold">
              <li className="flex items-center space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                <span>Itinerary & Mileage Summary</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                <span>Detailed Route Coordinates</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                <span>Violations & Compliance Audits</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                <span>Pillow-Drawn Daily Grid Sheets</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                <span>Auto-compiled Remarks & Signposts</span>
              </li>
            </ul>
          </div>

          {/* Legal Compliance Disclaimer */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center space-x-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span>FMCSA Compliance Check</span>
            </h4>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium leading-relaxed">
              This log set meets standard 70-hour / 8-day duty conditions for property-carrying drivers. Ensure to keep signature copies filed in your safety management files.
            </p>
          </div>
        </div>

        {/* PDF Iframe Viewer Column */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col min-h-[400px]">
          <div className="flex items-center space-x-2 mb-3 shrink-0">
            <Printer className="h-5 w-5 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Interactive Document Viewer</h3>
          </div>

          <div className="flex-grow bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/80 relative">
            {pdfUrl ? (
              <object
                data={pdfUrl}
                type="application/pdf"
                className="w-full h-full"
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <FileDown className="h-12 w-12 text-slate-400 animate-bounce" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Browser Preview Unsupported</h4>
                    <p className="text-xs text-slate-400 mt-1">Your browser doesn't support embedding PDF previews. Please click download below to save the logs locally.</p>
                  </div>
                  <a
                    href={pdfUrl}
                    download={`hos_trip_${tripId}_logs.pdf`}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer"
                  >
                    Download PDF Report
                  </a>
                </div>
              </object>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <Info className="h-8 w-8" />
                <span className="text-xs mt-2">No PDF compiled for preview.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PDFViewer;
