import type { ErrorOutput } from '../types/index.js';
import type { CacheService } from '../cache/cache-service.js';
import { getCacheTtl } from '../auth/tier-check.js';
import { getFinancialCenterWeather } from '../sources/weather.js';
import {
  getPoliticalCycle,
  getSeasonality,
  getMacroCalendar,
  analyzeWeatherSentiment,
  getDayOfWeekPattern,
  getHourPattern,
  type PoliticalCycleInfo,
  type SeasonalityInfo,
  type MacroCalendarInfo,
  type WeatherSentiment,
  type DayOfWeekInfo,
  type HourPatternInfo,
} from '../intelligence/alternative-signals.js';

const BASE_TTL = 1800; // 30 minutes

export interface AlternativeSignalsOutput {
  weather: WeatherSentiment;
  political_cycle: PoliticalCycleInfo;
  seasonality: SeasonalityInfo;
  day_of_week: DayOfWeekInfo;
  trading_session: HourPatternInfo;
  macro_calendar: MacroCalendarInfo;
  composite_alternative_bias: 'bullish' | 'bearish' | 'neutral';
  signal_count: number;
  bullish_signals: string[];
  bearish_signals: string[];
  agent_guidance: string;
}

export async function getAlternativeSignals(cache: CacheService): Promise<AlternativeSignalsOutput | ErrorOutput> {
  const cacheKey = 'alternative_signals';
  const cached = cache.get<AlternativeSignalsOutput>(cacheKey);
  if (cached) return cached.data;

  try {
    // Fetch weather (the only async call)
    const weatherData = await getFinancialCenterWeather();
    const weather = analyzeWeatherSentiment(weatherData);

    // Compute everything else (pure computation, no API calls)
    const political = getPoliticalCycle();
    const seasonal = getSeasonality();
    const calendar = getMacroCalendar();
    const dayOfWeek = getDayOfWeekPattern();
    const hourPattern = getHourPattern();

    // Composite scoring
    const bullish: string[] = [];
    const bearish: string[] = [];

    // Weather
    if (weather.weather_bias === 'positive') bullish.push('Sunshine effect: majority of financial centers in clear weather');
    if (weather.weather_bias === 'negative') bearish.push('Overcast effect: majority of financial centers under grey skies');

    // Political cycle
    if (political.term_year === 3) bullish.push(`Presidential cycle Year 3 — historically strongest year for equities (+16% avg)`);
    if (political.term_year === 2 && political.term_day > 180) bullish.push('Post-midterm rally period — historically strong');
    if (political.term_year === 1) bearish.push('Presidential Year 1 — policy uncertainty, historically modest returns');

    // Seasonality
    if (seasonal.monthly_bias === 'bullish') bullish.push(`${seasonal.month} has a historically bullish bias`);
    if (seasonal.monthly_bias === 'bearish') bearish.push(`${seasonal.month} has a historically bearish bias`);
    for (const effect of seasonal.active_effects) {
      if (effect.includes('Best six months') || effect.includes('Santa') || effect.includes('January Effect')) {
        bullish.push(effect);
      }
      if (effect.includes('Sell in May') || effect.includes('Monday effect')) {
        bearish.push(effect);
      }
    }

    // Day of week
    if (dayOfWeek.crypto_bias === 'bullish') bullish.push(`${dayOfWeek.day} historically bullish for crypto`);
    if (dayOfWeek.crypto_bias === 'bearish') bearish.push(`${dayOfWeek.day} historically bearish for crypto`);
    if (dayOfWeek.volume_expectation === 'low') bearish.push(`Low volume day (${dayOfWeek.day}) — elevated wick and liquidation risk`);

    // Trading session
    if (hourPattern.volume_expectation === 'low') bearish.push(`Off-hours session — thin order books, avoid large positions`);
    if (hourPattern.volume_expectation === 'peak') bullish.push(`Peak liquidity window (${hourPattern.session}) — best execution`);

    // Calendar
    if (calendar.calendar_risk === 'high') bearish.push('Major macro event imminent — elevated volatility risk');
    if (calendar.next_options_expiry.days_until <= 3) bearish.push(`Options expiration in ${calendar.next_options_expiry.days_until} days — expect volatility`);

    let compositeBias: AlternativeSignalsOutput['composite_alternative_bias'] = 'neutral';
    if (bullish.length > bearish.length + 1) compositeBias = 'bullish';
    else if (bearish.length > bullish.length + 1) compositeBias = 'bearish';

    const guidance = generateAlternativeGuidance(compositeBias, bullish, bearish, weather, political, seasonal, calendar);

    const result: AlternativeSignalsOutput = {
      weather,
      political_cycle: political,
      seasonality: seasonal,
      day_of_week: dayOfWeek,
      trading_session: hourPattern,
      macro_calendar: calendar,
      composite_alternative_bias: compositeBias,
      signal_count: bullish.length + bearish.length,
      bullish_signals: bullish,
      bearish_signals: bearish,
      agent_guidance: guidance,
    };

    cache.set(cacheKey, result, getCacheTtl(BASE_TTL));
    return result;
  } catch {
    return {
      error: true,
      error_source: 'get_alternative_signals',
      agent_guidance: 'Alternative signals temporarily unavailable. Retry shortly.',
      last_known_data: null,
      data_warnings: ['Alternative signals service temporarily unavailable.'],
    };
  }
}

function generateAlternativeGuidance(
  bias: string,
  bullish: string[],
  bearish: string[],
  weather: WeatherSentiment,
  political: PoliticalCycleInfo,
  seasonal: SeasonalityInfo,
  calendar: MacroCalendarInfo,
): string {
  let g = 'ALTERNATIVE SIGNALS ASSESSMENT: ';

  if (bias === 'bullish') {
    g += `${bullish.length} bullish vs ${bearish.length} bearish unconventional signals. Net bias: BULLISH. `;
  } else if (bias === 'bearish') {
    g += `${bearish.length} bearish vs ${bullish.length} bullish unconventional signals. Net bias: BEARISH. `;
  } else {
    g += `${bullish.length} bullish, ${bearish.length} bearish unconventional signals. Net bias: NEUTRAL. `;
  }

  g += `${political.term_year_label} of presidential cycle. ${seasonal.month} has ${seasonal.monthly_bias} historical bias. `;

  if (calendar.calendar_risk !== 'low') {
    g += `Calendar risk: ${calendar.calendar_risk}. ${calendar.calendar_guidance} `;
  }

  g += `Weather: ${weather.sunny_count}/${weather.financial_centers.length} financial centers sunny. `;
  g += 'These signals are supplementary — use alongside primary Fathom tools for complete context. They represent patterns that most agents completely ignore.';

  return g;
}
