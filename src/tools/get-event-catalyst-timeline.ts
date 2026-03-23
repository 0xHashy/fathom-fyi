import type { ErrorOutput } from '../types/index.js';
import { CacheService } from '../cache/cache-service.js';
import { getCacheTtl } from '../auth/tier-check.js';

const BASE_TTL = 1800; // 30 min cache

interface Catalyst {
  event: string;
  date: string;
  days_until: number;
  hours_until: number;
  impact: 'critical' | 'high' | 'medium' | 'low';
  category: 'monetary_policy' | 'economic_data' | 'options' | 'crypto_specific' | 'political';
  expected_direction: string;
  historical_volatility: string;
  trading_note: string;
}

interface CatalystTimelineOutput {
  current_date: string;
  next_24h: Catalyst[];
  next_7d: Catalyst[];
  next_30d: Catalyst[];
  catalyst_density: 'quiet' | 'normal' | 'busy' | 'critical';
  risk_windows: string[];
  agent_guidance: string;
}

// FOMC 2026 schedule
const FOMC_DATES_2026 = [
  '2026-01-28', '2026-03-18', '2026-05-06', '2026-06-17',
  '2026-07-29', '2026-09-16', '2026-11-04', '2026-12-16',
];

// Approximate CPI release dates 2026 (usually 2nd or 3rd Tuesday)
const CPI_DATES_2026 = [
  '2026-01-14', '2026-02-12', '2026-03-12', '2026-04-14',
  '2026-05-13', '2026-06-10', '2026-07-14', '2026-08-12',
  '2026-09-15', '2026-10-13', '2026-11-12', '2026-12-10',
];

// Jobs report (first Friday of each month)
const JOBS_DATES_2026 = [
  '2026-01-02', '2026-02-06', '2026-03-06', '2026-04-03',
  '2026-05-01', '2026-06-05', '2026-07-02', '2026-08-07',
  '2026-09-04', '2026-10-02', '2026-11-06', '2026-12-04',
];

// Monthly options expiry (3rd Friday)
const OPTIONS_EXPIRY_2026 = [
  '2026-01-16', '2026-02-20', '2026-03-20', '2026-04-17',
  '2026-05-15', '2026-06-19', '2026-07-17', '2026-08-21',
  '2026-09-18', '2026-10-16', '2026-11-20', '2026-12-18',
];

// Quarterly options expiry (quad witching — March, June, September, December)
const QUAD_WITCHING_2026 = ['2026-03-20', '2026-06-19', '2026-09-18', '2026-12-18'];

// Bitcoin halving (estimated)
const BTC_HALVING_ESTIMATE = '2028-04-01';

// Major political dates
const POLITICAL_DATES_2026 = [
  { date: '2026-11-03', event: 'US Midterm Elections', impact: 'high' as const },
];

function daysBetween(d1: Date, d2: Date): number {
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function hoursBetween(d1: Date, d2: Date): number {
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60));
}

function buildCatalyst(
  event: string,
  dateStr: string,
  now: Date,
  impact: Catalyst['impact'],
  category: Catalyst['category'],
  expectedDirection: string,
  historicalVol: string,
  tradingNote: string,
): Catalyst | null {
  const date = new Date(dateStr + 'T14:30:00Z');
  const days = daysBetween(now, date);
  const hours = hoursBetween(now, date);
  if (days < 0) return null;
  return {
    event,
    date: dateStr,
    days_until: days,
    hours_until: hours,
    impact,
    category,
    expected_direction: expectedDirection,
    historical_volatility: historicalVol,
    trading_note: tradingNote,
  };
}

export async function getEventCatalystTimeline(
  cache: CacheService,
): Promise<CatalystTimelineOutput | ErrorOutput> {
  const cacheKey = 'event_catalyst_timeline';
  const cached = cache.get<CatalystTimelineOutput>(cacheKey);
  if (cached) return cached.data;

  try {
    const now = new Date();
    const catalysts: Catalyst[] = [];

    // FOMC
    for (const d of FOMC_DATES_2026) {
      const c = buildCatalyst(
        'FOMC Rate Decision', d, now, 'critical', 'monetary_policy',
        'Markets compress volatility 3-5 days before, expand after. Direction depends on dot plot vs expectations.',
        'Average BTC move: ±4-8% in 48h around FOMC. Highest single-event volatility driver.',
        'Reduce position sizes 48h before. Close leveraged positions. Re-enter after volatility settles (usually 4-6 hours post-announcement).',
      );
      if (c) catalysts.push(c);
    }

    // CPI
    for (const d of CPI_DATES_2026) {
      const c = buildCatalyst(
        'CPI Inflation Data', d, now, 'high', 'economic_data',
        'Hot CPI = risk-off (bearish crypto). Cool CPI = risk-on (bullish crypto). Inline = muted reaction.',
        'Average BTC move: ±2-5% on CPI day. Stronger reactions on surprises.',
        'If BTC/S&P correlation is high (>0.7), CPI matters significantly. Position for the surprise scenario or flatten before release.',
      );
      if (c) catalysts.push(c);
    }

    // Jobs
    for (const d of JOBS_DATES_2026) {
      const c = buildCatalyst(
        'Non-Farm Payrolls (Jobs Report)', d, now, 'medium', 'economic_data',
        'Strong jobs = higher rate expectations (bearish). Weak jobs = rate cut expectations (bullish). Context-dependent.',
        'Average BTC move: ±1-3% on jobs day. Lower impact than CPI/FOMC.',
        'Monitor in context of rate cycle. Currently less impactful than CPI but watch for regime shifts.',
      );
      if (c) catalysts.push(c);
    }

    // Options expiry
    for (const d of OPTIONS_EXPIRY_2026) {
      const isQuad = QUAD_WITCHING_2026.includes(d);
      const c = buildCatalyst(
        isQuad ? 'Quarterly Options Expiry (Quad Witching)' : 'Monthly Options Expiry',
        d, now,
        isQuad ? 'high' : 'medium',
        'options',
        'Max pain gravity pulls price toward max pain level 2-3 days before expiry. Pin risk increases.',
        isQuad ? 'Quad witching: 20-40% higher volume. Expect sharp moves and reversals.' : 'Monthly expiry: 10-20% volume increase typical. Check max pain for directional bias.',
        isQuad ? 'Avoid opening new positions 48h before quad witching. High probability of stop hunts and fakeouts.' : 'Check max pain level via get_derivatives_context. Price tends to gravitate toward it.',
      );
      if (c) catalysts.push(c);
    }

    // Political
    for (const pd of POLITICAL_DATES_2026) {
      const c = buildCatalyst(
        pd.event, pd.date, now, pd.impact, 'political',
        'Midterm elections historically positive for equities in the following year. Year 3 of presidential cycle averages +16%.',
        'Election week volatility typically elevated. Resolution usually bullish.',
        'Position for post-election rally if historical patterns hold. Reduce exposure going into election week.',
      );
      if (c) catalysts.push(c);
    }

    // BTC halving
    const halvingCatalyst = buildCatalyst(
      'Bitcoin Halving (Estimated)', BTC_HALVING_ESTIMATE, now, 'critical', 'crypto_specific',
      'Halvings historically precede 12-18 month bull runs. Supply shock takes months to manifest in price.',
      'Post-halving cycles have produced 300-2000% BTC returns over 12-18 months historically.',
      'Accumulate BTC in the 6 months leading up to halving. Historical pattern suggests patience is rewarded.',
    );
    if (halvingCatalyst) catalysts.push(halvingCatalyst);

    // Sort by date
    catalysts.sort((a, b) => a.hours_until - b.hours_until);

    const next24h = catalysts.filter(c => c.hours_until <= 24 && c.hours_until >= 0);
    const next7d = catalysts.filter(c => c.days_until <= 7 && c.days_until >= 0);
    const next30d = catalysts.filter(c => c.days_until <= 30 && c.days_until >= 0);

    // Catalyst density
    const criticalCount = next7d.filter(c => c.impact === 'critical' || c.impact === 'high').length;
    const density: CatalystTimelineOutput['catalyst_density'] =
      criticalCount >= 3 ? 'critical' :
      criticalCount >= 2 ? 'busy' :
      next7d.length >= 3 ? 'normal' :
      'quiet';

    // Risk windows
    const riskWindows: string[] = [];
    for (const c of next7d) {
      if (c.impact === 'critical' || c.impact === 'high') {
        riskWindows.push(`${c.event} in ${c.days_until}d ${c.hours_until % 24}h — ${c.impact} impact. ${c.trading_note}`);
      }
    }

    // Guidance
    let guidance = '';
    if (next24h.some(c => c.impact === 'critical')) {
      guidance = `CRITICAL: ${next24h.find(c => c.impact === 'critical')!.event} within 24 hours. Reduce all position sizes. Close leveraged trades. This is the highest-impact event on the calendar.`;
    } else if (next24h.some(c => c.impact === 'high')) {
      guidance = `HIGH IMPACT: ${next24h.find(c => c.impact === 'high')!.event} within 24 hours. Tighten stops, reduce leverage, prepare for elevated volatility.`;
    } else if (density === 'critical') {
      guidance = `Event-dense week ahead: ${criticalCount} high-impact catalysts in the next 7 days. Reduce overall exposure and trade smaller. Multiple volatility events compound risk.`;
    } else if (density === 'busy') {
      guidance = `Moderately busy calendar. ${next7d.length} events in the next 7 days including ${criticalCount} high-impact. Monitor positioning ahead of each event.`;
    } else if (density === 'quiet') {
      guidance = `Quiet catalyst calendar. No major events imminent. Technical and sentiment signals are more reliable in low-catalyst environments. Good window for momentum-based strategies.`;
    } else {
      guidance = `Normal catalyst density. ${next7d.length} events in the next 7 days. Standard risk management applies. Watch the next high-impact event: ${next7d.find(c => c.impact === 'critical' || c.impact === 'high')?.event || 'none in 7d'}.`;
    }

    const result: CatalystTimelineOutput = {
      current_date: now.toISOString().split('T')[0],
      next_24h: next24h,
      next_7d: next7d,
      next_30d: next30d,
      catalyst_density: density,
      risk_windows: riskWindows,
      agent_guidance: guidance,
    };

    cache.set(cacheKey, result, getCacheTtl(BASE_TTL));
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return {
      error: true,
      error_source: 'calendar',
      agent_guidance: `Event catalyst timeline unavailable. ${msg}. Use general caution around known macro event dates.`,
      last_known_data: null,
      data_warnings: [msg],
    };
  }
}
