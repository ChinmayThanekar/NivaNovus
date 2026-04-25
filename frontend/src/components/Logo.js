export default function Logo({ size = 36 }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-logo">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#F3E5AB"/>
            <stop offset="100%" stopColor="#AA8822"/>
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="14" fill="#0B132B" stroke="url(#g1)" strokeWidth="1.4"/>
        <path d="M18 46 L18 18 L28 18 L42 38 L42 18 L46 18 L46 46 L36 46 L22 26 L22 46 Z"
              stroke="url(#g1)" strokeWidth="2.2" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
      </svg>
      <div className="leading-tight">
        <div className="font-serif text-xl tracking-wide text-white">Niva</div>
        <div className="text-[0.65rem] tracking-[0.3em] text-gold uppercase -mt-0.5">Novus</div>
      </div>
    </div>
  );
}
