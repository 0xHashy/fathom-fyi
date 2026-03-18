export default function handler(req, res) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0A0A08"/>

  <!-- centered content block -->

  <!-- Trident + Fathom wordmark, matching nav style -->
  <text x="600" y="260" font-family="Georgia, 'Times New Roman', serif" font-size="28" fill="#C9A84C" text-anchor="middle" letter-spacing="0.02em">Ψ</text>
  <text x="632" y="260" font-family="Georgia, 'Times New Roman', serif" font-size="28" fill="#F5F0E8" text-anchor="middle" font-weight="500" letter-spacing="0.02em">Fathom</text>

  <!-- thin rule -->
  <line x1="530" y1="285" x2="670" y2="285" stroke="#2A2A26" stroke-width="1"/>

  <!-- the question -->
  <text x="600" y="340" font-family="Georgia, 'Times New Roman', serif" font-size="42" fill="#F5F0E8" text-anchor="middle" font-weight="300">Can your agent</text>
  <text x="425" y="395" font-family="Georgia, 'Times New Roman', serif" font-size="42" fill="#C9A84C" text-anchor="middle" font-style="italic" font-weight="600">fathom</text>
  <text x="600" y="395" font-family="Georgia, 'Times New Roman', serif" font-size="42" fill="#F5F0E8" text-anchor="middle" font-weight="300"> the market?</text>

  <!-- stats row -->
  <line x1="320" y1="440" x2="880" y2="440" stroke="#2A2A26" stroke-width="1"/>

  <text x="380" y="475" font-family="monospace" font-size="10" fill="#4A4840" text-anchor="middle" letter-spacing="0.15em">TOOLS</text>
  <text x="380" y="498" font-family="Georgia, serif" font-size="22" fill="#F5F0E8" text-anchor="middle">22</text>

  <text x="500" y="475" font-family="monospace" font-size="10" fill="#4A4840" text-anchor="middle" letter-spacing="0.15em">SOURCES</text>
  <text x="500" y="498" font-family="Georgia, serif" font-size="22" fill="#F5F0E8" text-anchor="middle">6</text>

  <text x="620" y="475" font-family="monospace" font-size="10" fill="#4A4840" text-anchor="middle" letter-spacing="0.15em">RESPONSE</text>
  <text x="620" y="498" font-family="Georgia, serif" font-size="22" fill="#F5F0E8" text-anchor="middle">&lt;3s</text>

  <text x="740" y="475" font-family="monospace" font-size="10" fill="#4A4840" text-anchor="middle" letter-spacing="0.15em">FREE TIER</text>
  <text x="740" y="498" font-family="Georgia, serif" font-size="22" fill="#C9A84C" text-anchor="middle">Yes</text>

  <text x="840" y="475" font-family="monospace" font-size="10" fill="#4A4840" text-anchor="middle" letter-spacing="0.15em">SIGNALS</text>
  <text x="840" y="498" font-family="Georgia, serif" font-size="22" fill="#F5F0E8" text-anchor="middle">Live</text>

  <line x1="320" y1="520" x2="880" y2="520" stroke="#2A2A26" stroke-width="1"/>

  <!-- for your intelligence -->
  <text x="600" y="570" font-family="Georgia, 'Times New Roman', serif" font-size="14" fill="#C9A84C" text-anchor="middle" font-style="italic" letter-spacing="0.08em">For Your Intelligence</text>

  <!-- domain -->
  <text x="600" y="600" font-family="monospace" font-size="11" fill="#4A4840" text-anchor="middle" letter-spacing="0.15em">fathom.fyi</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(svg);
}
