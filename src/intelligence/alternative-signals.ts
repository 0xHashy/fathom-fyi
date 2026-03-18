import type { CityWeather } from '../sources/weather.js';

// ── Political Cycle ──
// US Presidential terms
const PRESIDENTIAL_TERMS = [
  { president: 'Biden', start: '2021-01-20', end: '2025-01-20' },
  { president: 'Trump', start: '2025-01-20', end: '2029-01-20' },
];

export interface PoliticalCycleInfo {
  current_president: string;
  term_day: number;
  term_year: number; // 1-4
  term_year_label: string;
  next_election_date: string;
  days_until_election: number;
  historical_pattern: string;
}

export function getPoliticalCycle(): PoliticalCycleInfo {
  const now = new Date();
  const current = PRESIDENTIAL_TERMS.find(t =>
    now >= new Date(t.start) && now < new Date(t.end)
  ) ?? PRESIDENTIAL_TERMS[PRESIDENTIAL_TERMS.length - 1];

  const termStart = new Date(current.start);
  const termDay = Math.floor((now.getTime() - termStart.getTime()) / 86400000);
  const termYear = Math.min(4, Math.floor(termDay / 365) + 1);

  const yearLabels: Record<number, string> = {
    1: 'Post-election (Year 1)',
    2: 'Midterm (Year 2)',
    3: 'Pre-election (Year 3)',
    4: 'Election year (Year 4)',
  };

  const patterns: Record<number, string> = {
    1: 'Year 1 historically sees policy uncertainty and moderate returns. New administrations establish economic direction. Markets typically cautious.',
    2: 'Midterm year historically shows elevated volatility. Pre-midterm correction is common. Post-midterm rally is one of the most reliable seasonal patterns.',
    3: 'Year 3 is historically the strongest year for equities. Incumbent party stimulates the economy ahead of re-election. S&P 500 averages +16% in year 3.',
    4: 'Election year typically shows strength in H1 and uncertainty in H2. Markets historically rally regardless of which party wins, once uncertainty resolves.',
  };

  // Next US presidential election
  const nextElection = new Date('2028-11-03');
  const daysUntil = Math.max(0, Math.floor((nextElection.getTime() - now.getTime()) / 86400000));

  return {
    current_president: current.president,
    term_day: termDay,
    term_year: termYear,
    term_year_label: yearLabels[termYear] ?? 'Unknown',
    next_election_date: '2028-11-03',
    days_until_election: daysUntil,
    historical_pattern: patterns[termYear] ?? '',
  };
}

// ── Seasonality ──

export interface SeasonalityInfo {
  month: string;
  month_number: number;
  day_of_week: string;
  week_of_year: number;
  seasonal_pattern: string;
  monthly_bias: 'bullish' | 'bearish' | 'neutral';
  active_effects: string[];
}

const MONTHLY_PATTERNS: Record<number, { bias: 'bullish' | 'bearish' | 'neutral'; pattern: string }> = {
  1: { bias: 'bullish', pattern: 'January Effect — historically positive for risk assets. Small caps tend to outperform. Tax-loss selling from December reverses.' },
  2: { bias: 'neutral', pattern: 'February is historically neutral. Post-January consolidation typical. Valentine\'s Day rally is a weak but documented pattern.' },
  3: { bias: 'neutral', pattern: 'March is mixed. Quarter-end rebalancing can create volatility. Window dressing by fund managers may inflate prices.' },
  4: { bias: 'bullish', pattern: 'April is historically the 2nd strongest month for equities. Tax refund season increases retail liquidity. "April showers bring May flowers" has a market analog.' },
  5: { bias: 'bearish', pattern: '"Sell in May and go away" — one of the most documented seasonal effects. May-October historically underperforms November-April by ~6% annually.' },
  6: { bias: 'neutral', pattern: 'June shows mixed returns. End of Q2 brings rebalancing flows. Summer trading begins with typically lower volumes.' },
  7: { bias: 'bullish', pattern: 'July tends to be positive — summer rally effect. Lower volume can amplify moves. Earnings season begins mid-month.' },
  8: { bias: 'bearish', pattern: 'August is historically weak. Low liquidity during vacation season. Flash crashes and geopolitical surprises are overrepresented in August.' },
  9: { bias: 'bearish', pattern: 'September is historically the worst month for equities. End-of-summer positioning, mutual fund tax-loss selling, and back-to-school psychology all contribute.' },
  10: { bias: 'neutral', pattern: 'October is volatile but not directionally biased. Famous for crashes (1929, 1987, 2008) but also for strong recoveries. "October surprise" effect in election years.' },
  11: { bias: 'bullish', pattern: 'November historically strong. "Best six months" period begins. Thanksgiving rally is documented. Post-election clarity in even years.' },
  12: { bias: 'bullish', pattern: 'December is historically positive — Santa Claus rally (last 5 trading days + first 2 of January). Tax-loss selling creates opportunities early in the month. Window dressing inflates winners.' },
};

export function getSeasonality(): SeasonalityInfo {
  const now = new Date();
  const month = now.getMonth() + 1;
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const weekOfYear = Math.ceil(dayOfYear / 7);

  const pattern = MONTHLY_PATTERNS[month] ?? { bias: 'neutral' as const, pattern: '' };

  const effects: string[] = [];

  // Check for specific patterns
  if (month === 12 && now.getDate() >= 20) effects.push('Santa Claus rally window active');
  if (month === 1 && now.getDate() <= 5) effects.push('January Effect — first week seasonality');
  if (month >= 5 && month <= 10) effects.push('"Sell in May" period — historically weaker 6 months');
  if (month >= 11 || month <= 4) effects.push('"Best six months" period (Nov-Apr) — historically stronger');
  if (now.getDay() === 1) effects.push('Monday effect — historically weakest day of the week');
  if (now.getDay() === 5) effects.push('Friday effect — historically positive, weekend positioning');

  // Quarter end
  if ((month === 3 || month === 6 || month === 9 || month === 12) && now.getDate() >= 25) {
    effects.push('Quarter-end rebalancing window — institutional flows may distort prices');
  }

  return {
    month: monthNames[month - 1],
    month_number: month,
    day_of_week: dayNames[now.getDay()],
    week_of_year: weekOfYear,
    seasonal_pattern: pattern.pattern,
    monthly_bias: pattern.bias,
    active_effects: effects,
  };
}

// ── Macro Calendar ──

export interface MacroCalendarInfo {
  next_fomc: { date: string; days_until: number };
  next_cpi: { date: string; days_until: number };
  next_jobs_report: { date: string; days_until: number };
  next_options_expiry: { date: string; days_until: number; type: string };
  calendar_risk: 'low' | 'moderate' | 'high';
  calendar_guidance: string;
}

// 2026 FOMC meeting dates (approximate — 2nd/3rd Wednesday pairs)
const FOMC_DATES_2026 = [
  '2026-01-28', '2026-03-18', '2026-05-06', '2026-06-17',
  '2026-07-29', '2026-09-16', '2026-11-04', '2026-12-16',
];

// CPI release dates (typically 2nd Tuesday/Wednesday of month)
const CPI_DATES_2026 = [
  '2026-01-14', '2026-02-12', '2026-03-11', '2026-04-14',
  '2026-05-13', '2026-06-10', '2026-07-15', '2026-08-12',
  '2026-09-16', '2026-10-14', '2026-11-12', '2026-12-09',
];

// Jobs report (first Friday of month)
const JOBS_DATES_2026 = [
  '2026-01-02', '2026-02-06', '2026-03-06', '2026-04-03',
  '2026-05-01', '2026-06-05', '2026-07-02', '2026-08-07',
  '2026-09-04', '2026-10-02', '2026-11-06', '2026-12-04',
];

function getNextDate(dates: string[]): { date: string; days_until: number } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  for (const d of dates) {
    if (d >= today) {
      const diff = Math.ceil((new Date(d).getTime() - now.getTime()) / 86400000);
      return { date: d, days_until: Math.max(0, diff) };
    }
  }

  // If all dates passed, return last one
  return { date: dates[dates.length - 1], days_until: 0 };
}

function getNextOptionsExpiry(): { date: string; days_until: number; type: string } {
  const now = new Date();
  // Monthly options expire 3rd Friday of each month
  // Quarterly: March, June, September, December
  for (let m = now.getMonth(); m < now.getMonth() + 3; m++) {
    const month = m % 12;
    const year = now.getFullYear() + Math.floor(m / 12);

    // Find 3rd Friday
    const firstDay = new Date(year, month, 1);
    let firstFriday = 1 + ((5 - firstDay.getDay() + 7) % 7);
    const thirdFriday = firstFriday + 14;
    const expiryDate = new Date(year, month, thirdFriday);

    if (expiryDate >= now) {
      const diff = Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000);
      const isQuarterly = [2, 5, 8, 11].includes(month);
      return {
        date: expiryDate.toISOString().slice(0, 10),
        days_until: Math.max(0, diff),
        type: isQuarterly ? 'Quarterly (higher volatility expected)' : 'Monthly',
      };
    }
  }

  return { date: 'unknown', days_until: 99, type: 'Monthly' };
}

export function getMacroCalendar(): MacroCalendarInfo {
  const fomc = getNextDate(FOMC_DATES_2026);
  const cpi = getNextDate(CPI_DATES_2026);
  const jobs = getNextDate(JOBS_DATES_2026);
  const options = getNextOptionsExpiry();

  // Calendar risk
  const minDays = Math.min(fomc.days_until, cpi.days_until, jobs.days_until, options.days_until);
  let risk: MacroCalendarInfo['calendar_risk'] = 'low';
  if (minDays <= 2) risk = 'high';
  else if (minDays <= 5) risk = 'moderate';

  let guidance = '';
  if (risk === 'high') {
    guidance = 'Major macro event imminent. Expect elevated volatility. Reduce position sizes and widen stops. Avoid opening new leveraged positions until the event passes.';
  } else if (risk === 'moderate') {
    guidance = 'Macro event approaching within 5 days. Markets may begin positioning. Watch for pre-event volatility compression followed by post-event expansion.';
  } else {
    guidance = 'No imminent macro catalysts. Calendar risk is low. Normal positioning appropriate.';
  }

  return {
    next_fomc: fomc,
    next_cpi: cpi,
    next_jobs_report: jobs,
    next_options_expiry: options,
    calendar_risk: risk,
    calendar_guidance: guidance,
  };
}

// ── Weather Sentiment ──

export interface WeatherSentiment {
  financial_centers: CityWeather[];
  sunny_count: number;
  overcast_count: number;
  weather_bias: 'positive' | 'negative' | 'neutral';
  sunshine_effect: string;
}

export function analyzeWeatherSentiment(weather: CityWeather[]): WeatherSentiment {
  const sunny = weather.filter(w => w.is_sunny).length;
  const overcast = weather.filter(w => !w.is_sunny).length;
  const total = weather.length;

  let bias: WeatherSentiment['weather_bias'] = 'neutral';
  let effect = '';

  if (total === 0) {
    effect = 'Weather data unavailable. No sunshine effect signal.';
  } else if (sunny >= total * 0.75) {
    bias = 'positive';
    effect = `${sunny}/${total} major financial centers experiencing clear weather. Academic research (Hirshleifer & Shumway, 2003) shows statistically significant positive correlation between sunshine in financial centers and same-day market returns. Slight bullish bias.`;
  } else if (overcast >= total * 0.75) {
    bias = 'negative';
    effect = `${overcast}/${total} major financial centers experiencing overcast/poor weather. The "sunshine effect" suggests a slight bearish bias when most trading floors are under grey skies. Effect is small but documented.`;
  } else {
    effect = `Mixed weather across financial centers (${sunny}/${total} sunny). No strong sunshine effect signal.`;
  }

  return {
    financial_centers: weather,
    sunny_count: sunny,
    overcast_count: overcast,
    weather_bias: bias,
    sunshine_effect: effect,
  };
}
