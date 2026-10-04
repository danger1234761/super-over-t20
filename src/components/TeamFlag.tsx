import React from 'react';

export interface TeamFlagProps {
  team: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'rounded';
  className?: string;
}

const SIZE_CONFIG = {
  xs: { box: 'w-4 h-4 text-[9px]', svgW: 16, svgH: 16 },
  sm: { box: 'w-5 h-5 text-[10px]', svgW: 20, svgH: 20 },
  md: { box: 'w-7 h-7 text-xs', svgW: 28, svgH: 28 },
  lg: { box: 'w-9 h-9 text-sm', svgW: 36, svgH: 36 },
  xl: { box: 'w-12 h-12 text-base', svgW: 48, svgH: 48 },
};

// Pure Vector SVG flags for guaranteed offline & cross-platform crisp rendering
const SVG_FLAGS: Record<string, React.ReactNode> = {
  // Australia 🇦🇺: Blue field with Union Jack in canton, Commonwealth 7-point star, and Southern Cross
  'Australia': (
    <svg viewBox="0 0 60 40" className="w-full h-full object-cover">
      <rect width="60" height="40" fill="#00008b" />
      {/* Union Jack Canton (top-left 30x20) */}
      <g>
        <rect width="30" height="20" fill="#00247d" />
        {/* St Andrew white diagonals */}
        <path d="M0,0 L30,20 M30,0 L0,20" stroke="#ffffff" strokeWidth="4" />
        {/* St Patrick red diagonals */}
        <path d="M0,0 L15,10 M30,0 L15,10 M0,20 L15,10 M30,20 L15,10" stroke="#cf142b" strokeWidth="2" />
        {/* St George white cross */}
        <path d="M15,0 V20 M0,10 H30" stroke="#ffffff" strokeWidth="6" />
        {/* St George red cross */}
        <path d="M15,0 V20 M0,10 H30" stroke="#cf142b" strokeWidth="3.5" />
      </g>
      {/* Commonwealth 7-pointed Star under canton */}
      <polygon
        points="15,24 16.5,27.5 20,27 17.5,29.5 19,33 15,31 11,33 12.5,29.5 10,27 13.5,27.5"
        fill="#ffffff"
      />
      {/* Southern Cross on fly */}
      {/* Alpha Crucis */}
      <circle cx="45" cy="33" r="1.8" fill="#ffffff" />
      {/* Beta Crucis */}
      <circle cx="37" cy="18" r="1.8" fill="#ffffff" />
      {/* Gamma Crucis */}
      <circle cx="45" cy="8" r="1.8" fill="#ffffff" />
      {/* Delta Crucis */}
      <circle cx="53" cy="15" r="1.8" fill="#ffffff" />
      {/* Epsilon Crucis */}
      <circle cx="48" cy="22" r="1.2" fill="#ffffff" />
    </svg>
  ),

  // England 🏴󠁧󠁢󠁥󠁮󠁧󠁿: White field with St. George's Red Cross
  'England': (
    <svg viewBox="0 0 60 40" className="w-full h-full object-cover">
      <rect width="60" height="40" fill="#ffffff" />
      <path d="M26,0 H34 V40 H26 Z" fill="#ce1124" />
      <path d="M0,16 V24 H60 V16 Z" fill="#ce1124" />
    </svg>
  ),

  // West Indies 🌴: Maroon field with gold Caribbean palm tree, sun, and cricket wickets crest
  'West Indies': (
    <svg viewBox="0 0 60 40" className="w-full h-full object-cover">
      <rect width="60" height="40" fill="#7B1113" />
      {/* Golden shield frame */}
      <path
        d="M20,6 H40 Q40,24 30,34 Q20,24 20,6 Z"
        fill="#FFCC00"
        stroke="#FFFFFF"
        strokeWidth="1"
      />
      {/* Green cricket island turf */}
      <ellipse cx="30" cy="24" rx="7" ry="3" fill="#008000" />
      {/* Palm tree trunk & leaves */}
      <path d="M29,23 Q28,17 30,13 Q32,17 31,23 Z" fill="#5C2E0B" />
      {/* Palm Fronds */}
      <circle cx="30" cy="12" r="4.5" fill="#1b5e20" />
      <circle cx="27" cy="11" r="3" fill="#2e7d32" />
      <circle cx="33" cy="11" r="3" fill="#2e7d32" />
      {/* Golden Rising Sun */}
      <circle cx="30" cy="8" r="3" fill="#FF8C00" />
      {/* Stumps / Wickets */}
      <line x1="28" y1="21" x2="28" y2="25" stroke="#ffffff" strokeWidth="0.8" />
      <line x1="30" y1="21" x2="30" y2="25" stroke="#ffffff" strokeWidth="0.8" />
      <line x1="32" y1="21" x2="32" y2="25" stroke="#ffffff" strokeWidth="0.8" />
      <line x1="27.5" y1="21" x2="32.5" y2="21" stroke="#ffffff" strokeWidth="0.8" />
    </svg>
  ),

  // India 🇮🇳: Saffron, White, Green with Ashoka Chakra
  'India': (
    <svg viewBox="0 0 60 40" className="w-full h-full object-cover">
      <rect width="60" height="13.33" fill="#FF9933" />
      <rect y="13.33" width="60" height="13.34" fill="#FFFFFF" />
      <rect y="26.67" width="60" height="13.33" fill="#138808" />
      {/* Ashoka Chakra */}
      <circle cx="30" cy="20" r="5" fill="none" stroke="#000080" strokeWidth="1" />
      <circle cx="30" cy="20" r="1.2" fill="#000080" />
      {/* Spokes */}
      <path
        d="M30,15 V25 M25,20 H35 M26.5,16.5 L33.5,23.5 M26.5,23.5 L33.5,16.5"
        stroke="#000080"
        strokeWidth="0.6"
      />
    </svg>
  ),

  // Pakistan 🇵🇰: Dark green with white vertical hoist stripe, crescent and star
  'Pakistan': (
    <svg viewBox="0 0 60 40" className="w-full h-full object-cover">
      <rect width="60" height="40" fill="#01411C" />
      <rect width="15" height="40" fill="#FFFFFF" />
      {/* Crescent Moon */}
      <path
        d="M40,11 A10,10 0 1,0 40,29 A8,8 0 1,1 40,11 Z"
        fill="#FFFFFF"
      />
      {/* 5-pointed Star */}
      <polygon
        points="41.5,16 42.5,18.5 45,18.5 43,20 44,22.5 41.5,21 39,22.5 40,20 38,18.5 40.5,18.5"
        fill="#FFFFFF"
      />
    </svg>
  ),

  // South Africa 🇿🇦: Six-color flag
  'South Africa': (
    <svg viewBox="0 0 60 40" className="w-full h-full object-cover">
      <rect width="60" height="20" fill="#E03C31" />
      <rect y="20" width="60" height="20" fill="#001489" />
      {/* White borders for Y */}
      <path d="M0,0 L24,20 L0,40 H9 L28,24 H60 V16 H28 L9,0 Z" fill="#FFFFFF" />
      {/* Green Y-shape pall */}
      <path d="M0,0 L22,18 L0,36 H6 L25,22 H60 V18 H25 L6,0 Z" fill="#007749" />
      {/* Gold triangle border */}
      <polygon points="0,4 18,20 0,36" fill="#FFB81C" />
      {/* Black hoist triangle */}
      <polygon points="0,7 14,20 0,33" fill="#000000" />
    </svg>
  ),

  // New Zealand 🇳🇿: Royal Blue with Union Jack and 4 Red Stars with white borders
  'New Zealand': (
    <svg viewBox="0 0 60 40" className="w-full h-full object-cover">
      <rect width="60" height="40" fill="#00247d" />
      {/* Union Jack Canton */}
      <g>
        <rect width="30" height="20" fill="#00247d" />
        <path d="M0,0 L30,20 M30,0 L0,20" stroke="#ffffff" strokeWidth="4" />
        <path d="M0,0 L15,10 M30,0 L15,10 M0,20 L15,10 M30,20 L15,10" stroke="#cc142b" strokeWidth="2" />
        <path d="M15,0 V20 M0,10 H30" stroke="#ffffff" strokeWidth="6" />
        <path d="M15,0 V20 M0,10 H30" stroke="#cc142b" strokeWidth="3.5" />
      </g>
      {/* 4 Red Stars with White Borders (Southern Cross) */}
      <circle cx="45" cy="9" r="2.2" fill="#ffffff" />
      <circle cx="45" cy="9" r="1.4" fill="#cc142b" />
      <circle cx="39" cy="20" r="2" fill="#ffffff" />
      <circle cx="39" cy="20" r="1.3" fill="#cc142b" />
      <circle cx="51" cy="18" r="2" fill="#ffffff" />
      <circle cx="51" cy="18" r="1.3" fill="#cc142b" />
      <circle cx="46" cy="30" r="2.4" fill="#ffffff" />
      <circle cx="46" cy="30" r="1.6" fill="#cc142b" />
    </svg>
  ),

  // Sri Lanka 🇱🇰: Gold border, Teal & Orange hoist, Maroon field with golden lion
  'Sri Lanka': (
    <svg viewBox="0 0 60 40" className="w-full h-full object-cover">
      <rect width="60" height="40" fill="#FFBE29" />
      {/* Orange vertical stripe */}
      <rect x="4" y="4" width="6" height="32" fill="#EB7400" />
      {/* Teal/Green vertical stripe */}
      <rect x="11" y="4" width="6" height="32" fill="#00534E" />
      {/* Maroon panel */}
      <rect x="19" y="4" width="37" height="32" fill="#8D153A" />
      {/* Golden Sinhalese Lion silhouette */}
      <circle cx="37" cy="18" r="7" fill="#FFBE29" />
      {/* Sword held upright */}
      <line x1="43" y1="12" x2="43" y2="23" stroke="#FFBE29" strokeWidth="1.8" />
      <line x1="41" y1="21" x2="45" y2="21" stroke="#FFBE29" strokeWidth="1.2" />
    </svg>
  ),

  // Afghanistan 🇦🇫: Black, Red, Green vertical tricolor with emblem
  'Afghanistan': (
    <svg viewBox="0 0 60 40" className="w-full h-full object-cover">
      <rect width="20" height="40" fill="#000000" />
      <rect x="20" width="20" height="40" fill="#D32011" />
      <rect x="40" width="20" height="40" fill="#007A3D" />
      {/* White National Mosque Emblem */}
      <circle cx="30" cy="20" r="6" fill="none" stroke="#FFFFFF" strokeWidth="1" />
      <path d="M27,24 H33 V18 L30,15 L27,18 Z" fill="#FFFFFF" />
    </svg>
  ),

  // Bangladesh 🇧🇩: Bottle Green with Red Circle
  'Bangladesh': (
    <svg viewBox="0 0 60 40" className="w-full h-full object-cover">
      <rect width="60" height="40" fill="#006A4E" />
      {/* Red disc shifted slightly to the hoist (cx=27) */}
      <circle cx="27" cy="20" r="11" fill="#F42A41" />
    </svg>
  ),

  // Zimbabwe 🇿🇼: 7 horizontal stripes with white hoist triangle and red star
  'Zimbabwe': (
    <svg viewBox="0 0 60 40" className="w-full h-full object-cover">
      <rect width="60" height="5.7" fill="#006400" />
      <rect y="5.7" width="60" height="5.7" fill="#FFD700" />
      <rect y="11.4" width="60" height="5.7" fill="#D40000" />
      <rect y="17.1" width="60" height="5.8" fill="#000000" />
      <rect y="22.9" width="60" height="5.7" fill="#D40000" />
      <rect y="28.6" width="60" height="5.7" fill="#FFD700" />
      <rect y="34.3" width="60" height="5.7" fill="#006400" />
      {/* White hoist triangle */}
      <polygon points="0,0 20,20 0,40" fill="#FFFFFF" />
      {/* Red Star */}
      <polygon
        points="7,16 8.5,19 12,19 9,21 10.5,24 7,22 3.5,24 5,21 2,19 5.5,19"
        fill="#D40000"
      />
    </svg>
  ),

  // Netherlands 🇳🇱: Red, White, Blue
  'Netherlands': (
    <svg viewBox="0 0 60 40" className="w-full h-full object-cover">
      <rect width="60" height="13.33" fill="#AE1C28" />
      <rect y="13.33" width="60" height="13.34" fill="#FFFFFF" />
      <rect y="26.67" width="60" height="13.33" fill="#21468B" />
    </svg>
  ),

  // Ireland 🇮🇪: Green, White, Orange vertical tricolor
  'Ireland': (
    <svg viewBox="0 0 60 40" className="w-full h-full object-cover">
      <rect width="20" height="40" fill="#169B62" />
      <rect x="20" width="20" height="40" fill="#FFFFFF" />
      <rect x="40" width="20" height="40" fill="#FF883E" />
    </svg>
  ),
};

export const TeamFlag: React.FC<TeamFlagProps> = ({
  team,
  size = 'md',
  shape = 'rounded',
  className = '',
}) => {
  const sz = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-md';

  // Normalize team name
  const trimmed = team.trim();
  const flagSvg = SVG_FLAGS[trimmed];

  if (flagSvg) {
    return (
      <div
        className={`inline-flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm border border-slate-700/70 bg-slate-900 ${sz.box} ${roundedClass} ${className}`}
        title={trimmed}
      >
        {flagSvg}
      </div>
    );
  }

  // Graceful fallback for any unknown team name
  const code = trimmed.substring(0, 3).toUpperCase();
  return (
    <div
      className={`inline-flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm border border-slate-700 bg-slate-800 text-amber-300 font-black font-mono-sport select-none ${sz.box} ${roundedClass} ${className}`}
      title={trimmed}
    >
      <span>{code}</span>
    </div>
  );
};
