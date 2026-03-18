export default function handler(req, res) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0A0A08"/>

  <!-- large ghosted trident watermark -->
  <text x="600" y="450" font-family="Georgia, serif" font-size="500" fill="#C9A84C" text-anchor="middle" opacity="0.035">Ψ</text>

  <!-- wordmark -->
  <text x="600" y="340" font-family="Georgia, serif" font-size="80" fill="#F5F0E8" text-anchor="middle" font-weight="400" letter-spacing="0.15em">FATHOM</text>

  <!-- tagline -->
  <text x="600" y="390" font-family="Georgia, serif" font-size="18" fill="#C9A84C" text-anchor="middle" font-style="italic">For Your Intelligence</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(svg);
}
