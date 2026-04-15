export function Logo({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
        <linearGradient id="logo-accent" x1="12" y1="8" x2="36" y2="40">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      {/* outer rounded square */}
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#logo-grad)" opacity="0.15" />
      <rect x="2" y="2" width="44" height="44" rx="12" stroke="url(#logo-grad)" strokeWidth="1.5" opacity="0.5" />
      {/* clipboard body */}
      <rect x="13" y="10" width="22" height="28" rx="3" fill="url(#logo-accent)" opacity="0.2" stroke="url(#logo-accent)" strokeWidth="1.5" />
      {/* clipboard clip */}
      <rect x="19" y="7" width="10" height="5" rx="2" fill="url(#logo-accent)" opacity="0.9" />
      {/* check lines */}
      <path d="M18 21l3 3 6-6" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="18" y1="29" x2="30" y2="29" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="18" y1="33" x2="26" y2="33" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      {/* flow arrow */}
      <path d="M33 20l4 4-4 4" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
}
