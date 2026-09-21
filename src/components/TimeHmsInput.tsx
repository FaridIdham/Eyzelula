import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import {
  splitSecondsToHms,
  hmsToTotalSeconds,
  formatHmsColon,
  formatHmsIndonesian
} from '../utils/timeUtils';

interface TimeHmsInputProps {
  totalSeconds: number;
  onChange: (totalSeconds: number) => void;
  minSeconds?: number;
  maxHours?: number;
  compact?: boolean;
  showQuickPresets?: boolean;
  idPrefix?: string;
  className?: string;
}

export const TimeHmsInput: React.FC<TimeHmsInputProps> = ({
  totalSeconds,
  onChange,
  minSeconds = 5,
  maxHours = 23,
  compact = false,
  showQuickPresets = true,
  idPrefix = 'hms',
  className = ''
}) => {
  const hms = splitSecondsToHms(totalSeconds);
  const [hours, setHours] = useState<number>(hms.hours);
  const [minutes, setMinutes] = useState<number>(hms.minutes);
  const [seconds, setSeconds] = useState<number>(hms.seconds);

  // Sync state if totalSeconds prop changes from external sources
  useEffect(() => {
    const updated = splitSecondsToHms(totalSeconds);
    setHours(updated.hours);
    setMinutes(updated.minutes);
    setSeconds(updated.seconds);
  }, [totalSeconds]);

  const notifyChange = (newH: number, newM: number, newS: number) => {
    const total = hmsToTotalSeconds(newH, newM, newS, minSeconds);
    onChange(total);
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    const safeH = isNaN(val) ? 0 : Math.min(maxHours, Math.max(0, val));
    setHours(safeH);
    notifyChange(safeH, minutes, seconds);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    const safeM = isNaN(val) ? 0 : Math.min(59, Math.max(0, val));
    setMinutes(safeM);
    notifyChange(hours, safeM, seconds);
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    const safeS = isNaN(val) ? 0 : Math.min(59, Math.max(0, val));
    setSeconds(safeS);
    notifyChange(hours, minutes, safeS);
  };

  const setPreset = (sec: number) => {
    const p = splitSecondsToHms(sec);
    setHours(p.hours);
    setMinutes(p.minutes);
    setSeconds(p.seconds);
    onChange(sec);
  };

  // Preset time options in seconds
  const presets = [
    { label: '30 Detik', seconds: 30 },
    { label: '1 Menit', seconds: 60 },
    { label: '1 Menit 30 Detik', seconds: 90 },
    { label: '2 Menit', seconds: 120 },
    { label: '3 Menit', seconds: 180 },
    { label: '5 Menit', seconds: 300 }
  ];

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 bg-amber-50/90 border border-amber-300/80 rounded-lg px-2 py-1 text-xs shadow-2xs ${className}`} title={`Alokasi: ${formatHmsIndonesian(totalSeconds)} (${formatHmsColon(totalSeconds)})`}>
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span className="text-[11px] font-bold text-amber-950 mr-0.5">Waktu:</span>
        <div className="flex items-center gap-0.5 font-mono">
          <input
            id={`${idPrefix}-compact-h`}
            type="number"
            min="0"
            max={maxHours}
            value={hours.toString().padStart(2, '0')}
            onChange={handleHoursChange}
            aria-label="Jam"
            title="Jam"
            className="w-7 text-center bg-white border border-amber-300 rounded px-0.5 py-0.5 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
          />
          <span className="text-amber-700 font-bold text-[10px]">:</span>
          <input
            id={`${idPrefix}-compact-m`}
            type="number"
            min="0"
            max="59"
            value={minutes.toString().padStart(2, '0')}
            onChange={handleMinutesChange}
            aria-label="Menit"
            title="Menit"
            className="w-7 text-center bg-white border border-amber-300 rounded px-0.5 py-0.5 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
          />
          <span className="text-amber-700 font-bold text-[10px]">:</span>
          <input
            id={`${idPrefix}-compact-s`}
            type="number"
            min="0"
            max="59"
            value={seconds.toString().padStart(2, '0')}
            onChange={handleSecondsChange}
            aria-label="Detik"
            title="Detik"
            className="w-7 text-center bg-white border border-amber-300 rounded px-0.5 py-0.5 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>
        <span className="text-[10px] text-amber-800 font-semibold ml-0.5">
          (J:M:D)
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Jam : Menit : Detik Inputs Display */}
      <div className="flex items-center gap-2 sm:gap-3 bg-white border-2 border-indigo-200/80 rounded-2xl p-2.5 sm:p-3 shadow-xs">
        {/* Hours / Jam */}
        <div className="flex-1 text-center">
          <label
            htmlFor={`${idPrefix}-h`}
            className="block text-[10px] font-black uppercase tracking-wider text-indigo-700 mb-1"
          >
            Jam
          </label>
          <input
            id={`${idPrefix}-h`}
            type="number"
            min="0"
            max={maxHours}
            value={hours.toString().padStart(2, '0')}
            onChange={handleHoursChange}
            className="w-full text-center text-lg sm:text-xl font-black font-mono text-slate-900 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl py-1.5 focus:ring-2 focus:ring-indigo-200 focus:outline-hidden transition"
          />
          <span className="text-[10px] text-slate-400 mt-0.5 block">00 - {maxHours}</span>
        </div>

        <span className="text-xl sm:text-2xl font-black text-indigo-300 self-center pb-3">:</span>

        {/* Minutes / Menit */}
        <div className="flex-1 text-center">
          <label
            htmlFor={`${idPrefix}-m`}
            className="block text-[10px] font-black uppercase tracking-wider text-indigo-700 mb-1"
          >
            Menit
          </label>
          <input
            id={`${idPrefix}-m`}
            type="number"
            min="0"
            max="59"
            value={minutes.toString().padStart(2, '0')}
            onChange={handleMinutesChange}
            className="w-full text-center text-lg sm:text-xl font-black font-mono text-slate-900 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl py-1.5 focus:ring-2 focus:ring-indigo-200 focus:outline-hidden transition"
          />
          <span className="text-[10px] text-slate-400 mt-0.5 block">00 - 59</span>
        </div>

        <span className="text-xl sm:text-2xl font-black text-indigo-300 self-center pb-3">:</span>

        {/* Seconds / Detik */}
        <div className="flex-1 text-center">
          <label
            htmlFor={`${idPrefix}-s`}
            className="block text-[10px] font-black uppercase tracking-wider text-indigo-700 mb-1"
          >
            Detik
          </label>
          <input
            id={`${idPrefix}-s`}
            type="number"
            min="0"
            max="59"
            value={seconds.toString().padStart(2, '0')}
            onChange={handleSecondsChange}
            className="w-full text-center text-lg sm:text-xl font-black font-mono text-slate-900 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl py-1.5 focus:ring-2 focus:ring-indigo-200 focus:outline-hidden transition"
          />
          <span className="text-[10px] text-slate-400 mt-0.5 block">00 - 59</span>
        </div>
      </div>

      {/* Live Badge Display */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-950">
        <div className="flex items-center gap-1.5 font-medium">
          <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Format Terpilih:</span>
          <span className="font-mono font-black text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
            {formatHmsColon(totalSeconds)}
          </span>
        </div>
        <span className="font-bold text-indigo-900">
          = {formatHmsIndonesian(totalSeconds)}
        </span>
      </div>

      {/* Quick Presets */}
      {showQuickPresets && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-500 block">
            Pilihan Cepat Waktu Ujian:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {presets.map(p => {
              const isSelected = totalSeconds === p.seconds;
              return (
                <button
                  key={p.seconds}
                  type="button"
                  onClick={() => setPreset(p.seconds)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
