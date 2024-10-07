// these are some example pool settings. make sure to add any Orca whirlpool you want to use
// to the POOL_SETTINGS object using the whirlpool's address as the key.
// adjust the settings as needed, and add any new tokens to config/tokens.ts

export const POOL_SETTINGS: {
  [key: string]: {
    name: string;
    feePct: number;
    rangePct: number;
    rebalanceStrategy: string;
    swapLossLimitPct: number;
    rebalanceLimitPct?: number; // checkPosition will check ths against the current position high/low to see if rebalance.
    rebalanceOnEdge?: boolean; // for pools with little other liquidity besides yours to ensure a rebalance occurs
    maxPriceRange?: {
      lower: number;
      upper: number;
    };
  };
} = {
  GgAqL1Lfs3zYZK6Gea9Bey5jmPbK8c4dmBbe5gPeYQEz: {
    name: "JitoSOL-USDC",
    feePct: 0.3,
    rangePct: 6 / 100,
    rebalanceStrategy: "both",
    swapLossLimitPct: 0.1 / 100,
    rebalanceLimitPct: 6 / 200,
  },
  bTnKHSTSDY49nKZpBfMuYpMDziodqvRQCNBMzKjJGhe: {
    name: "JupSOL-USDC",
    feePct: 0.3,
    rangePct: 6 / 100,
    rebalanceStrategy: "both",
    swapLossLimitPct: 0.04 / 100,
    rebalanceLimitPct: 6 / 200,
  },
  Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE: {
    name: "SOL-USDC",
    feePct: 0.04,
    rangePct: 5.8 / 100,
    rebalanceStrategy: "both",
    swapLossLimitPct: 0.05 / 100,
    rebalanceLimitPct: 5.8 / 200,
  },
  "9tXiuRRw7kbejLhZXtxDxYs2REe43uH2e7k1kocgdM9B": {
    name: "PYUSD-USDC",
    feePct: 0.01,
    rangePct: 0.02 / 100,
    rebalanceStrategy: "both",
    swapLossLimitPct: 0.015 / 100,
    rebalanceLimitPct: 0.02 / 100,
  },
  "39GrsozbzM9Sg1U7EDnEtQ69fsVF3pmVtmV2DGDAQQJ5": {
    name: "PYUSD-USDT",
    feePct: 0.01,
    rangePct: 0.02 / 100,
    rebalanceStrategy: "both",
    swapLossLimitPct: 0.015 / 100,
    rebalanceLimitPct: 0.02 / 100,
  },
  DxD41srN8Xk9QfYjdNXF9tTnP6qQxeF2bZF8s1eN62Pe: {
    name: "SOL-INF",
    feePct: 0.01,
    rangePct: 0.02 / 100,
    rebalanceStrategy: "both",
    swapLossLimitPct: 0.1 / 100,
  },
  "6NUiVmsNjsi4AfsMsEiaezsaV9N4N1ZrD4jEnuWNRvyb": {
    name: "JLP-USDC",
    feePct: 0.02,
    rangePct: 5.0 / 100,
    rebalanceStrategy: "up",
    swapLossLimitPct: 0.01 / 100,
  },
};
