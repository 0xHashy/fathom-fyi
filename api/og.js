import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  try {
    const img = readFileSync(join(process.cwd(), 'public', 'og.png'));
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(img);
  } catch {
    // Fallback: redirect to a placeholder
    res.status(302).setHeader('Location', 'https://fathom.fyi').send('');
  }
}
