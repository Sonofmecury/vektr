export function VektrLogo({size = 38, inverted = true}: {size?: number; inverted?: boolean}) {
  const ink = inverted ? "#F1F0EB" : "#242B2B";
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-label="Vektr trajectory mark">
    <path d="M7 17C18 17 20 21 31 25S47 29 57 29" stroke={ink} strokeWidth="5" strokeLinecap="square"/>
    <path d="M7 32H57" stroke={ink} strokeWidth="5" strokeLinecap="square"/>
    <path d="M7 47C18 47 20 43 31 39S47 35 57 35" stroke={ink} strokeWidth="5" strokeLinecap="square"/>
    <path d="M43 22H57" stroke="#D86F4A" strokeWidth="3" strokeLinecap="square"/>
  </svg>;
}
