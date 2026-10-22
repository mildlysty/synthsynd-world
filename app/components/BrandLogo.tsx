import { useId } from 'react';

type BrandSymbolProps = { className?: string };

export function BrandSymbol({ className = '' }: BrandSymbolProps) {
  const gemId = `brand-gem-${useId().replaceAll(':', '')}`;
  return (
    <span className={`brand-symbol ${className}`} aria-hidden="true">
      <svg viewBox="0 0 112 112" fill="none" focusable="false">
        <circle cx="56" cy="56" r="52" fill="#0D1018" stroke="#303548" strokeWidth="2" />
        <g className="brand-orbit brand-orbit-one"><ellipse cx="56" cy="56" rx="43" ry="17" transform="rotate(-32 56 56)" stroke="#65EEE2" strokeOpacity=".85" strokeWidth="2.2" /></g>
        <g className="brand-orbit brand-orbit-two"><ellipse cx="56" cy="56" rx="37" ry="14" transform="rotate(48 56 56)" stroke="#A28BFF" strokeOpacity=".88" strokeWidth="2" /></g>
        <path d="M15 77c14-4 23-15 35-21 15-8 28-7 43-26" stroke="#D879F0" strokeOpacity=".8" strokeWidth="2" strokeLinecap="round" />
        <path d="m56 25 25 15v29L56 84 31 69V40Z" fill="#171928" stroke={`url(#${gemId})`} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="m56 34 16 10v23L56 77 40 67V44Z" fill={`url(#${gemId})`} />
        <path d="M56 34v43M40 44l32 23M72 44 40 67" stroke="#F6FFFF" strokeOpacity=".72" strokeWidth="1.5" />
        <g className="brand-agents" stroke="#0D1018" strokeWidth="2.5">
          <circle cx="17" cy="34" r="5.5" fill="#65EEE2" /><circle cx="94" cy="28" r="5.5" fill="#A28BFF" />
          <circle cx="91" cy="83" r="5.5" fill="#D879F0" /><circle cx="26" cy="92" r="4.5" fill="#EAFBFF" />
        </g>
        <defs><linearGradient id={gemId} x1="31" y1="25" x2="82" y2="85" gradientUnits="userSpaceOnUse"><stop stopColor="#72F1E1" /><stop offset=".52" stopColor="#8B8DFF" /><stop offset="1" stopColor="#D879F0" /></linearGradient></defs>
      </svg>
    </span>
  );
}

export default function BrandLogo() {
  return (
    <span className="brand-lockup">
      <BrandSymbol />
      <span className="brand-type">
        <span className="brand-word"><span>Synth</span><span className="brand-word-accent">synd</span></span>
        <span className="brand-world">WORLD</span>
      </span>
    </span>
  );
}
