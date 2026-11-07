export function VektrLogo({size = 38}: {size?: number}) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <rect width="48" height="48" rx="12" fill="#102A3B"/>
    <path d="M9 14L22.4 35L39 11" stroke="#A9E9D1" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M29 14L38 14" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="39" cy="11" r="3" fill="#60D6B7"/>
  </svg>;
}
