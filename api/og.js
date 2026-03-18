// GET /api/og — generates Open Graph image as SVG served with PNG content type
// Twitter/X and other platforms will use this as the preview card

export default function handler(req, res) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0A0A08"/>

  <!-- subtle grid -->
  <defs>
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#1A1A18" stroke-width="0.5" opacity="0.4"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#grid)"/>

  <!-- top line -->
  <line x1="80" y1="80" x2="1120" y2="80" stroke="#2A2A26" stroke-width="1"/>

  <!-- label -->
  <text x="80" y="130" font-family="monospace" font-size="13" fill="#C9A84C" letter-spacing="0.3em">FATHOM.FYI</text>
  <text x="1120" y="130" font-family="monospace" font-size="13" fill="#4A4840" text-anchor="end" letter-spacing="0.1em">FOR YOUR INTELLIGENCE</text>

  <!-- main headline -->
  <text x="80" y="230" font-family="Georgia, serif" font-size="68" fill="#F5F0E8" font-weight="300">Can your agent</text>
  <text x="80" y="310" font-family="Georgia, serif" font-size="68" fill="#C9A84C" font-style="italic" font-weight="600">fathom</text>
  <text x="355" y="310" font-family="Georgia, serif" font-size="68" fill="#F5F0E8" font-weight="300"> the market?</text>

  <!-- subtitle -->
  <text x="80" y="380" font-family="sans-serif" font-size="22" fill="#8A8578">22 tools. 6 data sources. The patterns everyone ignores.</text>

  <!-- bottom stats -->
  <line x1="80" y1="450" x2="1120" y2="450" stroke="#2A2A26" stroke-width="1"/>

  <text x="80" y="490" font-family="monospace" font-size="11" fill="#4A4840" letter-spacing="0.15em">REGIME</text>
  <text x="80" y="515" font-family="monospace" font-size="14" fill="#8A8578">risk-off</text>

  <text x="240" y="490" font-family="monospace" font-size="11" fill="#4A4840" letter-spacing="0.15em">FEAR/GREED</text>
  <text x="240" y="515" font-family="monospace" font-size="14" fill="#8B2E2E">26</text>

  <text x="420" y="490" font-family="monospace" font-size="11" fill="#4A4840" letter-spacing="0.15em">CYCLE</text>
  <text x="420" y="515" font-family="monospace" font-size="14" fill="#C9A84C">Late Bull</text>

  <text x="580" y="490" font-family="monospace" font-size="11" fill="#4A4840" letter-spacing="0.15em">POSTURE</text>
  <text x="580" y="515" font-family="monospace" font-size="14" fill="#8B2E2E">DEFENSIVE</text>

  <text x="760" y="490" font-family="monospace" font-size="11" fill="#4A4840" letter-spacing="0.15em">RISK</text>
  <text x="760" y="515" font-family="monospace" font-size="14" fill="#C9A84C">55/100</text>

  <text x="900" y="490" font-family="monospace" font-size="11" fill="#4A4840" letter-spacing="0.15em">WEATHER</text>
  <text x="900" y="515" font-family="monospace" font-size="14" fill="#8A8578">3/4 overcast</text>

  <!-- trident -->
  <text x="1080" y="560" font-family="Georgia, serif" font-size="40" fill="#C9A84C" text-anchor="middle" opacity="0.3">Ψ</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(svg);
}
