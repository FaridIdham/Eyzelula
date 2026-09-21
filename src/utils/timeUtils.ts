/**
 * Utility functions for handling exam question time limits in hours:minutes:seconds (jam:menit:detik)
 */

export interface HmsTime {
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Splits total seconds into hours, minutes, and seconds
 */
export function splitSecondsToHms(totalSeconds: number): HmsTime {
  const safeSec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSec / 3600);
  const minutes = Math.floor((safeSec % 3600) / 60);
  const seconds = safeSec % 60;
  return { hours, minutes, seconds };
}

/**
 * Converts hours, minutes, seconds into total seconds (minimum minSeconds)
 */
export function hmsToTotalSeconds(
  hours: number,
  minutes: number,
  seconds: number,
  minSeconds = 5
): number {
  const h = Math.max(0, Math.floor(Number(hours) || 0));
  const m = Math.max(0, Math.floor(Number(minutes) || 0));
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const total = h * 3600 + m * 60 + s;
  return Math.max(minSeconds, total);
}

/**
 * Formats seconds into HH:MM:SS format (e.g. 00:01:30)
 */
export function formatHmsColon(totalSeconds: number, alwaysIncludeHours = true): string {
  const { hours, minutes, seconds } = splitSecondsToHms(totalSeconds);
  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');

  if (hours > 0 || alwaysIncludeHours) {
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Formats seconds into readable Indonesian format, e.g.:
 * - 90 s -> "1 Menit 30 Detik"
 * - 3600 s -> "1 Jam"
 * - 3690 s -> "1 Jam 1 Menit 30 Detik"
 * - 45 s -> "45 Detik"
 */
export function formatHmsIndonesian(totalSeconds: number): string {
  const { hours, minutes, seconds } = splitSecondsToHms(totalSeconds);
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} Jam`);
  if (minutes > 0) parts.push(`${minutes} Menit`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} Detik`);
  return parts.join(' ');
}

/**
 * Formats seconds into compact Indonesian format, e.g.:
 * - 90 s -> "1m 30s"
 * - 3690 s -> "1j 1m 30s"
 */
export function formatHmsCompact(totalSeconds: number): string {
  const { hours, minutes, seconds } = splitSecondsToHms(totalSeconds);
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}j`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

/**
 * Gets duration in seconds from question or default, ensuring fallback compatibility
 */
export function getQuestionDurationSeconds(
  item?: { timeLimitSeconds?: number; timeLimitMinutes?: number } | null,
  defaultSeconds = 60
): number {
  if (item?.timeLimitSeconds && item.timeLimitSeconds > 0) {
    return Math.max(5, Math.floor(item.timeLimitSeconds));
  }
  if (item?.timeLimitMinutes && item.timeLimitMinutes > 0) {
    return Math.max(5, Math.round(item.timeLimitMinutes * 60));
  }
  return Math.max(5, Math.floor(defaultSeconds || 60));
}
