const mark = "M0 0 93 36 125 88 157 36 250 0 125 205ZM57 48 125 158 193 48 173 56 125 135 77 56ZM68 113C35 135 15 168 15 205h99l-15-25H43c7-19 23-37 40-47Zm119 4c30 22 47 52 47 88H135l15-25h56c-7-19-19-35-33-44Z";
const wordmark = "M0 0h22l22 44L67 0h21L55 61H32ZM102 0h60l-7 13h-45v12h46l-6 12h-40v11h52l-7 13H91V17Zm68 0h20v25L217 0h25l-34 29 38 32h-26l-30-26v26h-20ZM253 0h73l-7 14h-25v47h-20V14h-29ZM338 0h40q26 0 26 21 0 15-17 20l18 20h-24l-16-19h-20v19h-20V28h50q10 0 10-7t-10-7h-45Z";

export function VektrLogo({size = 38}: {size?: number}) {
  return <svg width={size} height={size} viewBox="0 0 250 205" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d={mark}/>
  </svg>;
}

export function VektrWordmark({width = 84}: {width?: number}) {
  return <svg width={width} height={width * 61 / 405} viewBox="0 0 405 61" fill="currentColor" role="img" aria-label="Vektr">
    <path d={wordmark}/>
  </svg>;
}
