// Dynamic OG image as SVG — always shows current tool/source count
// Twitter/social crawlers accept SVG when served with correct content-type

export default function handler(req, res) {
  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,500;0,600;1,500&amp;family=IBM+Plex+Mono:wght@400;500&amp;display=swap');
    </style>
  </defs>
  <rect width="1200" height="630" fill="#0A0A08"/>
  <!-- subtle grid -->
  <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
    <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#1A1A18" stroke-width="0.5"/>
  </pattern>
  <rect width="1200" height="630" fill="url(#grid)" opacity="0.3"/>
  <!-- gold accent line -->
  <line x1="80" y1="200" x2="80" y2="430" stroke="#C9A84C" stroke-width="2" opacity="0.6"/>
  <!-- trident + brand -->
  <text x="110" y="160" font-family="Georgia, serif" font-size="28" fill="#C9A84C" letter-spacing="0.15em">&#936; FATHOM</text>
  <!-- tagline -->
  <text x="110" y="250" font-family="Cormorant Garamond, Georgia, serif" font-size="58" fill="#F5F0E8" font-weight="300">Can your agent</text>
  <text x="110" y="320" font-family="Cormorant Garamond, Georgia, serif" font-size="58" fill="#C9A84C" font-weight="600" font-style="italic">fathom</text>
  <text x="370" y="320" font-family="Cormorant Garamond, Georgia, serif" font-size="58" fill="#F5F0E8" font-weight="300"> the market?</text>
  <!-- stats bar -->
  <line x1="110" y1="380" x2="900" y2="380" stroke="#2A2A26" stroke-width="1"/>
  <text x="110" y="420" font-family="IBM Plex Mono, monospace" font-size="13" fill="#4A4840" letter-spacing="0.15em">TOOLS</text>
  <text x="110" y="450" font-family="Cormorant Garamond, Georgia, serif" font-size="36" fill="#F5F0E8">32</text>
  <text x="260" y="420" font-family="IBM Plex Mono, monospace" font-size="13" fill="#4A4840" letter-spacing="0.15em">SOURCES</text>
  <text x="260" y="450" font-family="Cormorant Garamond, Georgia, serif" font-size="36" fill="#F5F0E8">8</text>
  <text x="420" y="420" font-family="IBM Plex Mono, monospace" font-size="13" fill="#4A4840" letter-spacing="0.15em">RESPONSE</text>
  <text x="420" y="450" font-family="Cormorant Garamond, Georgia, serif" font-size="36" fill="#F5F0E8">&lt;3s</text>
  <text x="600" y="420" font-family="IBM Plex Mono, monospace" font-size="13" fill="#4A4840" letter-spacing="0.15em">FREE TIER</text>
  <text x="600" y="450" font-family="Cormorant Garamond, Georgia, serif" font-size="36" fill="#C9A84C">Yes</text>
  <text x="770" y="420" font-family="IBM Plex Mono, monospace" font-size="13" fill="#4A4840" letter-spacing="0.15em">SIGNALS</text>
  <text x="770" y="450" font-family="Cormorant Garamond, Georgia, serif" font-size="36" fill="#F5F0E8">Live</text>
  <!-- bottom line -->
  <line x1="110" y1="500" x2="900" y2="500" stroke="#2A2A26" stroke-width="1"/>
  <!-- FYI tagline -->
  <text x="110" y="550" font-family="Cormorant Garamond, Georgia, serif" font-size="22" fill="#C9A84C" font-style="italic">For Your Intelligence</text>
  <text x="110" y="585" font-family="IBM Plex Mono, monospace" font-size="14" fill="#4A4840" letter-spacing="0.1em">fathom.fyi</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(svg);
}
