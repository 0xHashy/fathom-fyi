export default function handler(req, res) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0D0D0A"/>
      <stop offset="100%" stop-color="#080806"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#D4B254"/>
      <stop offset="100%" stop-color="#B8943E"/>
    </linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0D0D0A"/>
      <stop offset="20%" stop-color="#C9A84C"/>
      <stop offset="80%" stop-color="#C9A84C"/>
      <stop offset="100%" stop-color="#0D0D0A"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Subtle grid -->
  <g opacity="0.04" stroke="#C9A84C" stroke-width="0.5">
    <line x1="300" y1="0" x2="300" y2="630"/>
    <line x1="600" y1="0" x2="600" y2="630"/>
    <line x1="900" y1="0" x2="900" y2="630"/>
    <line x1="0" y1="157" x2="1200" y2="157"/>
    <line x1="0" y1="315" x2="1200" y2="315"/>
    <line x1="0" y1="472" x2="1200" y2="472"/>
  </g>

  <!-- Trident -->
  <text x="600" y="150" text-anchor="middle" font-family="Georgia, serif" font-size="52" fill="url(#gold)" opacity="0.3">&#936;</text>

  <!-- Divider -->
  <rect x="200" y="175" width="800" height="1" fill="url(#line)" opacity="0.4"/>

  <!-- Headline -->
  <text x="600" y="250" text-anchor="middle" font-family="Georgia, serif" font-size="38" fill="#F5F0E8" letter-spacing="0.5">The intelligence layer between</text>
  <text x="600" y="300" text-anchor="middle" font-family="Georgia, serif" font-size="38" fill="#F5F0E8" letter-spacing="0.5">your agent and a bad trade.</text>

  <!-- Stats row -->
  <g text-anchor="middle">
    <text x="370" y="380" font-family="monospace" font-size="11" fill="#8A8578" letter-spacing="3">SIGNALS</text>
    <text x="370" y="410" font-family="Georgia, serif" font-size="30" fill="#F5F0E8">27</text>
    <rect x="485" y="370" width="1" height="48" fill="#2A2A26"/>
    <text x="600" y="380" font-family="monospace" font-size="11" fill="#8A8578" letter-spacing="3">SOURCES</text>
    <text x="600" y="410" font-family="Georgia, serif" font-size="30" fill="#F5F0E8">8</text>
    <rect x="715" y="370" width="1" height="48" fill="#2A2A26"/>
    <text x="830" y="380" font-family="monospace" font-size="11" fill="#8A8578" letter-spacing="3">RESPONSE</text>
    <text x="830" y="410" font-family="Georgia, serif" font-size="30" fill="#F5F0E8">&lt;3s</text>
  </g>

  <!-- Divider -->
  <rect x="200" y="450" width="800" height="1" fill="url(#line)" opacity="0.25"/>

  <!-- Brand -->
  <text x="600" y="500" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="url(#gold)" letter-spacing="6">FATHOM</text>
  <text x="600" y="530" text-anchor="middle" font-family="monospace" font-size="11" fill="#8A8578" letter-spacing="4">FOR YOUR INTELLIGENCE</text>

  <!-- Domain -->
  <text x="600" y="580" text-anchor="middle" font-family="monospace" font-size="13" fill="#4A4840">fathom.fyi</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  // Short cache so the new image propagates quickly
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(svg);
}
