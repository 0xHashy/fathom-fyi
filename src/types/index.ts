// ─── Tier System ───

export type ApiTier = 'free' | 'starter' | 'pro' | 'trading_bot';

export interface TierConfig {
  tools: string[];
  rateLimit: number; // requests per hour, -1 = unlimited
  cacheTtlMultiplier: number;
  webhooks: boolean;
}

export interface TierViolation {
  error: 'upgrade_required';
  message: string;
  upgrade_url: string;
  available_on_free: string[];
}

// ─── Market Regime ───

export type Regime = 'risk-on' | 'risk-off' | 'transitional' | 'euphoric' | 'capitulation';

export interface MarketRegimeOutput {
  regime: Regime;
  confidence: number;
  evidence: string[];
  historical_analog: string;
  fear_greed_score: number;
  fear_greed_label: string;
  btc_dominance: number;
  btc_dominance_trend: 'rising' | 'falling' | 'neutral';
  total_market_cap_usd: number;
  market_cap_change_24h: number;
  agent_guidance: string;
}

// ─── Narrative Pulse ───

export interface NarrativeEntry {
  narrative: string;
  category_id: string;
  market_cap_usd: number;
  change_24h: number;
  change_7d: number;
  momentum_score: number;
  signal: string;
}

export interface EmergingNarrative {
  narrative: string;
  signal: string;
  why_notable: string;
}

export type CyclePhase = 'early' | 'mid' | 'late' | 'exhausted';

export interface NarrativePulseOutput {
  accelerating: NarrativeEntry[];
  decelerating: NarrativeEntry[];
  emerging: EmergingNarrative[];
  dominant_theme: string;
  cycle_phase: CyclePhase;
  agent_guidance: string;
}

// ─── Asset Context ───

export type CyclePosition = 'accumulation' | 'markup' | 'distribution' | 'markdown';
export type VolumeHealth = 'thin' | 'normal' | 'elevated' | 'extreme';
export type PriceTrend = 'strong_uptrend' | 'uptrend' | 'sideways' | 'downtrend' | 'strong_downtrend';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'extreme';

export interface AssetContextOutput {
  asset: string;
  coingecko_id: string;
  price_usd: number;
  market_cap_usd: number;
  volume_24h: number;
  cycle_position: CyclePosition;
  vs_ath_percentage: number;
  vs_atl_percentage: number;
  volume_health: VolumeHealth;
  volume_vs_30d_average: number;
  price_trend: PriceTrend;
  holder_behavior: string;
  risk_level: RiskLevel;
  agent_guidance: string;
}

// ─── Temporal Context ───

export type TemporalCyclePhase =
  | 'accumulation' | 'early_bull' | 'mid_bull' | 'late_bull'
  | 'early_bear' | 'mid_bear' | 'late_bear';

export interface TemporalContextOutput {
  current_date: string;
  last_halving_date: string;
  next_halving_estimated: string;
  days_since_last_halving: number;
  days_until_next_halving: number;
  cycle_progress_percentage: number;
  estimated_cycle_phase: TemporalCyclePhase;
  phase_confidence: number;
  historical_pattern: string;
  cycle_1_analog: string;
  cycle_2_analog: string;
  cycle_3_analog: string;
  typical_duration_remaining: string;
  agent_guidance: string;
}

// ─── DeFi Health ───

export interface ChainTvl {
  name: string;
  tvl_usd: number;
  tvl_change_7d: number;
  dominance_percentage: number;
}

export interface ProtocolTvl {
  name: string;
  tvl_usd: number;
  category: string;
  change_7d: number;
}

export type TvlTrend = 'expanding' | 'stable' | 'contracting' | 'collapsing';
export type RevenueTrend = 'growing' | 'stable' | 'declining';
export type EcosystemConcentration = 'healthy' | 'concentrated' | 'dangerous';

export interface DefiHealthOutput {
  total_tvl_usd: number;
  tvl_change_24h: number;
  tvl_change_7d: number;
  tvl_trend: TvlTrend;
  top_chains: ChainTvl[];
  top_protocols: ProtocolTvl[];
  defi_health_score: number;
  protocol_revenue_trend: RevenueTrend;
  ecosystem_concentration: EcosystemConcentration;
  agent_guidance: string;
}

// ─── Macro Context ───

export type FedTrend = 'hiking' | 'holding' | 'cutting';
export type DxyTrend = 'strengthening' | 'stable' | 'weakening';
export type YieldCurveState = 'normal' | 'flat' | 'inverted';
export type RecessionProbability = 'low' | 'moderate' | 'elevated' | 'high';
export type MacroCryptoImpact = 'tailwind' | 'neutral' | 'headwind' | 'strong_headwind';

export interface MacroContextOutput {
  fed_funds_rate: number;
  fed_funds_trend: FedTrend;
  dxy_value: number;
  dxy_trend: DxyTrend;
  yield_curve: number;
  yield_curve_state: YieldCurveState;
  recession_probability: RecessionProbability;
  macro_crypto_impact: MacroCryptoImpact;
  macro_summary: string;
  agent_guidance: string;
}

// ─── On-Chain Pulse ───

export interface MinerPool {
  pool_name: string;
  share_percentage: number;
}

export type Congestion = 'empty' | 'normal' | 'busy' | 'congested';
export type NetworkSecurity = 'strong' | 'normal' | 'weak';
export type MiningEconomics = 'profitable' | 'marginal' | 'stressed';
export type OnchainActivity = 'high' | 'normal' | 'low';

export interface OnchainPulseOutput {
  block_height: number;
  mempool_congestion: Congestion;
  recommended_fee_sats: number;
  miner_distribution: MinerPool[];
  network_security: NetworkSecurity;
  mining_economics: MiningEconomics;
  onchain_activity: OnchainActivity;
  agent_guidance: string;
}

// ─── Sentiment State ───

export interface SentimentStateOutput {
  fear_greed_current: number;
  fear_greed_7d_ago: number;
  fear_greed_trend: 'improving' | 'stable' | 'deteriorating';
  fear_greed_label: string;
  sentiment_narrative: string;
  extreme_fear_opportunity: boolean;
  extreme_greed_warning: boolean;
  contrarian_signal: string;
  agent_guidance: string;
}

// ─── Reality Check (Master) ───

export type RiskEnvironment = 'green' | 'yellow' | 'orange' | 'red';
export type SuggestedPosture = 'aggressive' | 'moderate' | 'defensive' | 'sideline';

export interface RealityCheckOutput {
  timestamp: string;
  fathom_version: string;
  executive_summary: string;
  overall_risk_environment: RiskEnvironment;
  risk_score: number;
  opportunity_score: number;
  regime: MarketRegimeOutput;
  cycle: TemporalContextOutput;
  defi: DefiHealthOutput;
  macro: MacroContextOutput;
  sentiment: SentimentStateOutput;
  onchain: OnchainPulseOutput;
  top_narratives: NarrativeEntry[];
  alternative_signals?: {
    weather: unknown;
    political_cycle: unknown;
    seasonality: { month: string; bias: string; active_effects: string[] };
    macro_calendar: { next_fomc: unknown; next_cpi: unknown; next_options_expiry: unknown; calendar_risk: string };
    composite_bias: string;
    bullish_signals: string[];
    bearish_signals: string[];
  };
  agent_guidance: string;
  suggested_posture: SuggestedPosture;
  key_risks: string[];
  key_opportunities: string[];
  data_freshness: string;
  sources_used: string[];
  data_warnings: string[];
}

// ─── Error Output ───

export interface ErrorOutput {
  error: true;
  error_source: string;
  agent_guidance: string;
  last_known_data: unknown;
  data_warnings: string[];
}

// ─── CoinGecko API Types ───

export interface CoinGeckoGlobal {
  data: {
    total_market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    market_cap_percentage: Record<string, number>;
    market_cap_change_percentage_24h_usd: number;
  };
}

export interface CoinGeckoMarketCoin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  ath: number;
  ath_change_percentage: number;
  atl: number;
  atl_change_percentage: number;
}

export interface CoinGeckoCategory {
  id: string;
  name: string;
  market_cap: number;
  market_cap_change_24h: number;
  volume_24h: number;
  top_3_coins: string[];
}

export interface CoinGeckoTrending {
  coins: Array<{
    item: {
      id: string;
      name: string;
      symbol: string;
      market_cap_rank: number;
      data?: {
        price_change_percentage_24h?: Record<string, number>;
      };
    };
  }>;
}

// ─── DeFiLlama Types ───

export interface DefiLlamaChain {
  name: string;
  tvl: number;
  tokenSymbol?: string;
}

export interface DefiLlamaProtocol {
  name: string;
  tvl: number;
  category: string;
  change_7d: number | null;
  chain: string;
}

// ─── Fear & Greed Types ───

export interface FearGreedEntry {
  value: string;
  value_classification: string;
  timestamp: string;
}

export interface FearGreedResponse {
  data: FearGreedEntry[];
}

// ─── FRED Types ───

export interface FredObservation {
  date: string;
  value: string;
}

export interface FredResponse {
  observations: FredObservation[];
}

// ─── Mempool Types ───

export interface MempoolFees {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export interface MempoolPool {
  name: string;
  share: number;
}

export interface MempoolHashratePools {
  pools: MempoolPool[];
}

export interface MempoolDifficultyAdjustment {
  difficultyChange: number;
  progressPercent: number;
}
