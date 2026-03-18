export default function handler(req, res) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0A0A08"/>

  <!-- single thin gold line across the top third -->
  <line x1="0" y1="210" x2="1200" y2="210" stroke="#C9A84C" stroke-width="0.5" opacity="0.15"/>

  <!-- the trident, large, centered, ghosted -->
  <text x="600" y="420" font-family="Georgia, 'Times New Roman', serif" font-size="360" fill="#C9A84C" text-anchor="middle" opacity="0.04">Ψ</text>

  <!-- FATHOM wordmark -->
  <text x="600" y="290" font-family="Georgia, 'Times New Roman', serif" font-size="96" fill="#F5F0E8" text-anchor="middle" font-weight="400" letter-spacing="0.12em">FATHOM</text>

  <!-- tagline -->
  <text x="600" y="345" font-family="Georgia, 'Times New Roman', serif" font-size="20" fill="#C9A84C" text-anchor="middle" font-style="italic" letter-spacing="0.05em">For Your Intelligence</text>

  <!-- thin rule under tagline -->
  <line x1="480" y1="370" x2="720" y2="370" stroke="#2A2A26" stroke-width="1"/>

  <!-- descriptor -->
  <text x="600" y="410" font-family="'Helvetica Neue', Arial, sans-serif" font-size="15" fill="#8A8578" text-anchor="middle" letter-spacing="0.08em">Financial Reality Intelligence for AI Agents</text>

  <!-- bottom domain -->
  <text x="600" y="560" font-family="monospace" font-size="12" fill="#4A4840" text-anchor="middle" letter-spacing="0.2em">fathom.fyi</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(svg);
}
