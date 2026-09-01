import React, { useState, useMemo } from 'react';
import { 
  Plane, Info, Calculator, CheckCircle, XCircle, 
  AlertCircle, TrendingUp, ChevronRight, ArrowRight, History, Trash2, Save
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, doc } from 'firebase/firestore';

// Latest May 2026 industry valuations
const PROGRAMS = [
  { id: 'qantas', name: 'Qantas Frequent Flyer', currency: 'AUD', benchmark: 1.3, min: 0.9, tips: 'Classic Rewards are key; avoid Classic Plus.' },
  { id: 'velocity', name: 'Velocity (Virgin Aus)', currency: 'AUD', benchmark: 1.7, min: 1.1, tips: 'Great for domestic business and partner redemptions.' },
  { id: 'krisflyer', name: 'Singapore KrisFlyer', currency: 'SGD/AUD', benchmark: 1.35, min: 1.0, tips: 'Best for long-haul business class to Europe/Asia.' },
  { id: 'asia-miles', name: 'Cathay Asia Miles', currency: 'HKD/AUD', benchmark: 1.3, min: 0.9, tips: 'Excellent for premium cabins on Cathay Pacific.' },
  { id: 'skymiles', name: 'Delta SkyMiles', currency: 'USD/AUD', benchmark: 1.2, min: 1.0, tips: 'Best used for domestic "SkyMiles Deals".' },
  { id: 'mileageplus', name: 'United MileagePlus', currency: 'USD/AUD', benchmark: 1.35, min: 1.0, tips: 'Good for partner awards with no fuel surcharges.' },
  { id: 'emirates', name: 'Emirates Skywards', currency: 'AED/AUD', benchmark: 1.2, min: 0.9, tips: 'High surcharges; look for upgrades instead.' },
];

const App = () => {
  const [cashPrice, setCashPrice] = useState('');
  const [pointsCost, setPointsCost] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState(PROGRAMS[0].id);
  // Search history is kept only in component state (in-memory), so it
  // resets whenever the page is refreshed, per the feature request.
  const [history, setHistory] = useState([]);

  const selectedProgram = PROGRAMS.find(p => p.id === selectedProgramId);

  const stats = useMemo(() => {
    const cash = parseFloat(cashPrice);
    const points = parseFloat(pointsCost);
    if (!cash || !points || points === 0) return null;
    const cpp = (cash / points) * 100;
    
    let rating = 'Poor';
    let color = 'text-red-500';
    let bgColor = 'bg-red-50';
    let icon = <XCircle className="w-5 h-5" />;

    if (cpp >= selectedProgram.benchmark) {
      rating = 'Excellent Deal';
      color = 'text-emerald-600';
      bgColor = 'bg-emerald-50';
      icon = <CheckCircle className="w-5 h-5" />;
    } else if (cpp >= selectedProgram.min) {
      rating = 'Fair Deal';
      color = 'text-amber-600';
      bgColor = 'bg-amber-50';
      icon = <AlertCircle className="w-5 h-5" />;
    }

    return { cpp: cpp.toFixed(2), rating, color, bgColor, icon };
  }, [cashPrice, pointsCost, selectedProgram]);

  const saveCalculationToHistory = () => {
    if (!stats) return;

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      programName: selectedProgram.name,
      cashPrice,
      pointsCost,
      cpp: stats.cpp,
      rating: stats.rating,
      timestamp: new Date(),
    };

    setHistory(prev => [entry, ...prev]);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Plane className="w-24 h-24 rotate-12" />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Point Valuing system</h1>
          </div>
          <p className="text-slate-500 text-sm">Maxing out your travel points in 2026.</p>
        </div>

        {/* Inputs */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Airline Program</label>
            <select 
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
            >
              {PROGRAMS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Cash Price ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input 
                  type="number"
                  placeholder="956"
                  value={cashPrice}
                  onChange={(e) => setCashPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Points Cost</label>
              <input 
                type="number"
                placeholder="55200"
                value={pointsCost}
                onChange={(e) => setPointsCost(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Results Card */}
        {stats ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`rounded-2xl p-6 border bg-white border-slate-100 shadow-sm relative overflow-hidden`}>
              {/* Simple background indicator */}
              <div className={`absolute top-0 right-0 w-1 h-full ${stats.color.replace('text', 'bg')}`} />
              
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={`p-3 rounded-full bg-slate-50 ${stats.color}`}>
                  {stats.icon}
                </div>
                <div>
                  <span className={`text-xs font-bold uppercase tracking-widest ${stats.color}`}>The Verdict</span>
                  <h2 className={`text-3xl font-black text-slate-800`}>{stats.rating}</h2>
                </div>
                
                <div className="grid grid-cols-2 gap-8 w-full pt-4 border-t border-slate-100">
                  <div className="text-center">
                    <p className="text-slate-400 text-xs uppercase font-bold tracking-tight">Value per Point</p>
                    <p className={`text-2xl font-bold ${stats.color}`}>{stats.cpp}c</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400 text-xs uppercase font-bold tracking-tight">Program Goal</p>
                    <p className="text-2xl font-bold text-slate-800">{selectedProgram.benchmark}c+</p>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    onClick={saveCalculationToHistory}
                    className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95"
                  >
                    <Save className="w-5 h-5" /> Save to History
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200 shadow-sm">
            <Calculator className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-medium italic">Enter values above to calculate the value of your points</p>
          </div>
        )}

        {/* Program Tip */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex gap-4 items-start">
          <div className="p-2 bg-amber-50 rounded-lg shrink-0">
            <Info className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-800 mb-1">{selectedProgram.name} Tip</h4>
            <p className="text-xs text-slate-500 leading-relaxed">{selectedProgram.tips}</p>
          </div>
        </div>

        {/* Pro Tip - Persistent */}
        <div className="text-center">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em]">
            Always subtract taxes & fees from cash price for accuracy
          </p>
        </div>

        {/* Search History */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-slate-400" />
                <h3 className="font-bold text-sm uppercase tracking-wide text-slate-700">Search History</h3>
              </div>
              <button
                onClick={clearHistory}
                className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mb-3">
              Kept only in this browser session &mdash; cleared when you refresh the page.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100">
                    <th className="py-2 pr-2 font-bold">Program</th>
                    <th className="py-2 pr-2 font-bold">Cash</th>
                    <th className="py-2 pr-2 font-bold">Points</th>
                    <th className="py-2 pr-2 font-bold">CPP</th>
                    <th className="py-2 font-bold">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(entry => (
                    <tr key={entry.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 pr-2 text-slate-700">{entry.programName}</td>
                      <td className="py-2 pr-2 text-slate-700">${entry.cashPrice}</td>
                      <td className="py-2 pr-2 text-slate-700">{entry.pointsCost}</td>
                      <td className="py-2 pr-2 font-semibold text-slate-800">{entry.cpp}c</td>
                      <td className="py-2 text-slate-700">{entry.rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;