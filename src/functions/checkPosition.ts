import { POOL_SETTINGS } from "../config/index.js";
import { Decimal } from "decimal.js";
import { WhirlpoolData } from "../types/global.js";

// returns false if no action
// returns true if rebalance needed
export async function checkPosition(
  whirlpool_data: WhirlpoolData
): Promise<boolean> {
  try {
    const poolSettings = POOL_SETTINGS[whirlpool_data.whirlpoolAddress];
    const strategy = poolSettings.rebalanceStrategy;
    const limit_pct = poolSettings.rebalanceLimitPct;
    const currentRange = {
      lower: new Decimal(whirlpool_data.lower.price),
      upper: new Decimal(whirlpool_data.upper.price),
    };
    const maxPriceRange = poolSettings.maxPriceRange;
    // if price current price range is already at or beyond range limit, don't rebalance
    if (
      (maxPriceRange &&
        new Decimal(currentRange.lower).lessThanOrEqualTo(
          new Decimal(maxPriceRange.lower)
        )) ||
      (maxPriceRange &&
        new Decimal(currentRange.upper).greaterThanOrEqualTo(
          new Decimal(maxPriceRange.upper)
        ))
    ) {
      console.log(
        `Check Position: Position at range limit. No need to rebalance.`
      );
      return false;
    }
    // if price breaches upper range of pool
    if (
      new Decimal(whirlpool_data.whirlpoolPrice).greaterThan(
        new Decimal(whirlpool_data.upper.price)
      )
    ) {
      // check pool's strategy
      if (strategy === "both" || strategy === "up") {
        // check pool's limit variable
        if (
          limit_pct &&
          new Decimal(whirlpool_data.whirlpoolPrice).lessThan(
            new Decimal(whirlpool_data.upper.price).times(1 + limit_pct)
          )
        ) {
          return true;
        } else if (!limit_pct) {
          return true;
        }
        return false;
      }
      // if price breaches lower range of pool
    } else if (
      new Decimal(whirlpool_data.whirlpoolPrice).lessThan(
        new Decimal(whirlpool_data.lower.price)
      )
    ) {
      // check pool's strategy
      if (strategy === "both" || strategy === "down") {
        // check pool's limit variable
        if (
          limit_pct &&
          new Decimal(whirlpool_data.whirlpoolPrice).greaterThan(
            new Decimal(whirlpool_data.lower.price).times(1 - limit_pct)
          )
        ) {
          return true;
        } else if (!limit_pct) {
          return true;
        }
        return false;
      }
      // if price is on edge of range and rebalanceOnEdge is true
    } else if (
      poolSettings.rebalanceOnEdge &&
      (new Decimal(whirlpool_data.whirlpoolPrice).equals(
        new Decimal(whirlpool_data.lower.price)
      ) ||
        new Decimal(whirlpool_data.whirlpoolPrice).equals(
          new Decimal(whirlpool_data.upper.price)
        ))
    ) {
      return true;
    }
    return false;
  } catch (error) {
    console.log(`Check Position Error: Waiting 5 seconds... ${error}`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return checkPosition(whirlpool_data);
  }
}
