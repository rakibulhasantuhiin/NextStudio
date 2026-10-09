/**
 * Generates an SVG data URL for initial demo passport portrait
 */
export function getSamplePassportPhoto(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="450" viewBox="0 0 350 450">
    <rect width="350" height="450" fill="#2563eb"/>
    <ellipse cx="175" cy="160" rx="66" ry="85" fill="#f8d7b8"/>
    <!-- Hair -->
    <path d="M 105 150 Q 175 60 245 150 Q 175 95 105 150 Z" fill="#1e293b"/>
    <!-- Eyes -->
    <ellipse cx="148" cy="155" rx="6" ry="4.5" fill="#0f172a"/>
    <ellipse cx="202" cy="155" rx="6" ry="4.5" fill="#0f172a"/>
    <!-- Eyebrows -->
    <path d="M 136 144 Q 148 138 162 144" stroke="#1e293b" stroke-width="2.6" fill="none"/>
    <path d="M 188 144 Q 202 138 214 144" stroke="#1e293b" stroke-width="2.6" fill="none"/>
    <!-- Nose -->
    <path d="M 175 155 L 171 182 L 180 182" stroke="#d49b73" stroke-width="2.2" fill="none"/>
    <!-- Lips -->
    <path d="M 162 205 Q 175 212 188 205" stroke="#b91c1c" stroke-width="2.6" fill="none"/>
    <!-- Ears -->
    <ellipse cx="108" cy="165" rx="7" ry="14" fill="#f8d7b8"/>
    <ellipse cx="242" cy="165" rx="7" ry="14" fill="#f8d7b8"/>
    <!-- Neck -->
    <rect x="157" y="235" width="36" height="45" fill="#f8d7b8"/>
    <!-- Collar & Suit -->
    <path d="M 96 450 L 122 280 L 175 325 L 228 280 L 254 450 Z" fill="#ffffff"/>
    <path d="M 60 450 L 114 280 L 158 450 Z" fill="#0f172a"/>
    <path d="M 290 450 L 236 280 L 192 450 Z" fill="#0f172a"/>
    <polygon points="171,325 179,325 178,405 172,405" fill="#dc2626"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates an SVG data URL for demo NID Front Side
 */
export function getSampleNidFront(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="856" height="540" viewBox="0 0 856 540">
    <rect width="856" height="540" rx="24" fill="#ffffff" stroke="#cbd5e1" stroke-width="4"/>
    <!-- Hologram header band -->
    <rect x="10" y="10" width="836" height="70" rx="14" fill="#ecfdf5"/>
    <circle cx="60" cy="45" r="24" fill="#059669"/>
    <text x="100" y="42" font-family="sans-serif" font-weight="bold" font-size="22" fill="#065f46">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</text>
    <text x="100" y="65" font-family="sans-serif" font-size="14" fill="#047857">Government of the People's Republic of Bangladesh</text>
    <text x="560" y="45" font-family="sans-serif" font-weight="bold" font-size="20" fill="#047857">জাতীয় পরিচয়পত্র / NID CARD</text>

    <!-- Photo area -->
    <rect x="50" y="110" width="180" height="225" rx="8" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
    <ellipse cx="140" cy="190" rx="45" ry="55" fill="#cbd5e1"/>
    <path d="M 90 290 C 90 240 190 240 190 290 Z" fill="#64748b"/>

    <!-- Details text -->
    <text x="260" y="140" font-family="sans-serif" font-size="16" fill="#475569">নাম: <tspan font-weight="bold" fill="#0f172a">মোঃ রাকিবুল হাসান</tspan></text>
    <text x="260" y="175" font-family="sans-serif" font-size="16" fill="#475569">Name: <tspan font-weight="bold" fill="#0f172a">MD. RAKIBUL HASAN</tspan></text>
    <text x="260" y="210" font-family="sans-serif" font-size="16" fill="#475569">পিতা: মোঃ নজরুল ইসলাম</text>
    <text x="260" y="245" font-family="sans-serif" font-size="16" fill="#475569">মাতা: মোছাঃ শাহিদা খাতুন</text>
    <text x="260" y="280" font-family="sans-serif" font-size="16" fill="#475569">Date of Birth: <tspan font-weight="bold" fill="#0f172a">12 Oct 1998</tspan></text>

    <!-- Smart Chip -->
    <rect x="710" y="130" width="90" height="75" rx="8" fill="#fde047" stroke="#ca8a04" stroke-width="2"/>

    <!-- NID Number Bar -->
    <rect x="50" y="360" width="756" height="50" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
    <text x="70" y="392" font-family="sans-serif" font-size="16" fill="#475569">NID NO: <tspan font-family="monospace" font-weight="bold" font-size="22" fill="#b91c1c">1998 261 485 7001</tspan></text>

    <!-- Signatures -->
    <text x="50" y="450" font-family="sans-serif" font-size="12" fill="#94a3b8">স্বাক্ষর / Signature</text>
    <path d="M 50 480 Q 90 460 140 485 T 190 475" stroke="#0f172a" stroke-width="2" fill="none"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates an SVG data URL for demo NID Back Side
 */
export function getSampleNidBack(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="856" height="540" viewBox="0 0 856 540">
    <rect width="856" height="540" rx="24" fill="#ffffff" stroke="#cbd5e1" stroke-width="4"/>
    
    <!-- Header Notice -->
    <rect x="20" y="15" width="816" height="40" rx="8" fill="#f1f5f9"/>
    <text x="40" y="40" font-family="sans-serif" font-size="13" fill="#334155">এই কার্ডটি গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের সম্পত্তি। কার্ডটি পাওয়া গেলে নিকটস্থ পোস্ট অফিসে জমা দিন।</text>

    <!-- Address info -->
    <text x="50" y="90" font-family="sans-serif" font-size="15" fill="#475569">ঠিকানা: বাসা/হোল্ডিং: ১২/এ, রোড: ৪, ধানমন্ডি, ঢাকা - ১২০৫</text>
    <text x="50" y="120" font-family="sans-serif" font-size="15" fill="#475569">রক্তের গ্রুপ / Blood Group: <tspan font-weight="bold" fill="#b91c1c">B (+ve)</tspan>  |  জন্মস্থান: ঢাকা</text>
    <text x="50" y="150" font-family="sans-serif" font-size="15" fill="#475569">প্রদানের তারিখ: ০৮/০১/২০২০</text>

    <!-- Barcode area -->
    <rect x="50" y="180" width="756" height="80" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
    <!-- Barcode vertical lines -->
    <g fill="#0f172a">
      <rect x="80" y="195" width="4" height="50"/>
      <rect x="90" y="195" width="8" height="50"/>
      <rect x="105" y="195" width="3" height="50"/>
      <rect x="115" y="195" width="12" height="50"/>
      <rect x="135" y="195" width="5" height="50"/>
      <rect x="145" y="195" width="9" height="50"/>
      <rect x="160" y="195" width="4" height="50"/>
      <rect x="170" y="195" width="14" height="50"/>
      <rect x="190" y="195" width="6" height="50"/>
      <rect x="205" y="195" width="10" height="50"/>
      <rect x="225" y="195" width="4" height="50"/>
      <rect x="235" y="195" width="8" height="50"/>
      <rect x="250" y="195" width="15" height="50"/>
      <rect x="275" y="195" width="4" height="50"/>
      <rect x="285" y="195" width="7" height="50"/>
      <rect x="300" y="195" width="11" height="50"/>
      <rect x="320" y="195" width="5" height="50"/>
      <rect x="335" y="195" width="9" height="50"/>
      <rect x="350" y="195" width="16" height="50"/>
      <rect x="375" y="195" width="4" height="50"/>
      <rect x="390" y="195" width="12" height="50"/>
      <rect x="410" y="195" width="6" height="50"/>
      <rect x="425" y="195" width="8" height="50"/>
      <rect x="440" y="195" width="14" height="50"/>
      <rect x="460" y="195" width="5" height="50"/>
      <rect x="475" y="195" width="10" height="50"/>
      <rect x="495" y="195" width="7" height="50"/>
      <rect x="510" y="195" width="12" height="50"/>
      <rect x="530" y="195" width="4" height="50"/>
      <rect x="545" y="195" width="15" height="50"/>
      <rect x="570" y="195" width="6" height="50"/>
      <rect x="585" y="195" width="9" height="50"/>
      <rect x="605" y="195" width="13" height="50"/>
      <rect x="625" y="195" width="5" height="50"/>
      <rect x="640" y="195" width="8" height="50"/>
      <rect x="655" y="195" width="14" height="50"/>
      <rect x="680" y="195" width="6" height="50"/>
      <rect x="695" y="195" width="10" height="50"/>
      <rect x="715" y="195" width="18" height="50"/>
    </g>

    <!-- MRZ (Machine Readable Zone) -->
    <rect x="50" y="280" width="756" height="230" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
    <text x="70" y="350" font-family="monospace" font-size="28" letter-spacing="4" fill="#0f172a">I&lt;BGDRAS1998261485&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
    <text x="70" y="410" font-family="monospace" font-size="28" letter-spacing="4" fill="#0f172a">9810127M2801083BGD&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;8</text>
    <text x="70" y="470" font-family="monospace" font-size="28" letter-spacing="4" fill="#0f172a">HASAN&lt;&lt;MD&lt;RAKIBUL&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
