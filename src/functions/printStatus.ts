import { POOL_SETTINGS, TOKENS_BY_MINT } from "../config/index.js";
import { fetchTokenPricesJup, getWalletBalance } from "../utils/index.js";
import { getCtx } from "./index.js";
import { fetchWhirlpoolsDataBundle } from "./fetchWhirlpoolData.js";
import { readJsonFile } from "../utils/readWriteJSON.js";

// minimal status update
export async function printStatusMin() {
  try {
    const whirlpools_data = await fetchWhirlpoolsDataBundle(true);
    let tokens_in_wallet = await getWalletBalance();
    tokens_in_wallet = Object.fromEntries(
      Object.entries(tokens_in_wallet!).filter(
        ([key, token]: [string, any]) => token.amount > 0
      )
    );
    const prices = await fetchTokenPricesJup(Object.keys(TOKENS_BY_MINT));
    if (Array.isArray(whirlpools_data)) {
      // USD VALUES
      const position_usd_total = whirlpools_data.reduce((total, data: any) => {
        return (
          total +
          data.tokenA.amount * prices[data.tokenA.mint]?.price +
          data.tokenB.amount * prices[data.tokenB.mint]?.price
        );
      }, 0);

      const fee_total_usd = whirlpools_data.reduce((total, data: any) => {
        return (
          total +
          data.fees.feeOwedA * prices[data.tokenA.mint]?.price +
          data.fees.feeOwedB * prices[data.tokenB.mint]?.price
        );
      }, 0);

      const reward_total_usd = whirlpools_data.reduce((total, data: any) => {
        return (
          total +
          data.rewards[0]?.amount * prices[data.rewards[0]?.token]?.price +
          data.rewards[1]?.amount * prices[data.rewards[1]?.token]?.price +
          data.rewards[2]?.amount * prices[data.rewards[2]?.token]?.price
        );
      }, 0);
      const wallet_balance = Object.entries(tokens_in_wallet).reduce(
        (total, [key, token]: [string, any]) => {
          const tokenPrice = prices[token.mint]?.price;
          if (tokenPrice) {
            return total + token.ui_amount * tokenPrice;
          }
          return total;
        },
        0
      );
      console.log(
        `Status: ${new Date().toLocaleString()}, Positions: ${
          whirlpools_data.length
        }, Total Open Value: $${(
          position_usd_total +
          fee_total_usd +
          reward_total_usd +
          wallet_balance
        )?.toFixed(2)}`
      );
    }
    return;
  } catch (error) {
    console.log(`Print Status Error: Skipping status print... ${error}`);
    return;
  }
}
// Status Update
export async function printStatus() {
  try {
    const ctx = await getCtx();
    let whirlpools_data = await fetchWhirlpoolsDataBundle(true);
    if (whirlpools_data === 1) {
      console.log("no whirlpools bundle found");
      return;
    } else if (whirlpools_data === 2) {
      console.log("no open positions found");
      return;
    }
    const positions_record = readJsonFile("positions");
    let tokens_in_wallet = await getWalletBalance();
    tokens_in_wallet = Object.fromEntries(
      Object.entries(tokens_in_wallet!).filter(
        ([key, token]: [string, any]) => token.amount > 0
      )
    );
    const prices = await fetchTokenPricesJup(Object.keys(TOKENS_BY_MINT));
    const wallet_balance = Object.entries(tokens_in_wallet).reduce(
      (total, [key, token]: [string, any]) => {
        const tokenPrice = prices[token.mint]?.price;
        if (tokenPrice) {
          return total + token.ui_amount * tokenPrice;
        }
        return total;
      },
      0
    );
    // print status
    console.table({
      "Local Time": new Date().toLocaleString(),
      Wallet: ctx.wallet.publicKey.toBase58(),
      "Total Positions": Array.isArray(whirlpools_data)
        ? whirlpools_data.length
        : 0,
      "Tokens in Wallet": `${
        Object.keys(tokens_in_wallet).length
      } (Total: $${wallet_balance?.toFixed(2)})`,
      ...Object.fromEntries(
        Object.entries(tokens_in_wallet).map(([key, token]: [string, any]) => [
          `${TOKENS_BY_MINT[token.mint]?.name}`,
          `${token.ui_amount?.toFixed(4)} ($${(
            prices[token.mint]?.price * token.ui_amount
          )?.toFixed(2)}) Price: $${prices[token.mint]?.price?.toFixed(2)}`,
        ])
      ),
    });
    if (Array.isArray(whirlpools_data)) {
      whirlpools_data.forEach(async (data: any, index: number) => {
        const poolSettings = POOL_SETTINGS[data.whirlpoolAddress];

        // VARIABLES
        const ratio_a_to_dashes = "-".repeat((data.tokenA.ratio * 20) | 0);
        const ratio_b_to_dashes = "-".repeat((data.tokenB.ratio * 20) | 0);
        // USD VALUES
        const position_usd_total =
          data.tokenA.amount * prices[data.tokenA.mint]?.price +
          data.tokenB.amount * prices[data.tokenB.mint]?.price;
        const fee_total_usd =
          data.fees.feeOwedA * prices[data.tokenA.mint]?.price +
          data.fees.feeOwedB * prices[data.tokenB.mint]?.price;
        // console.log(data.fees);
        const reward_total_usd =
          data.rewards[0]?.amount * prices[data.rewards[0]?.token]?.price +
          data.rewards[1]?.amount * prices[data.rewards[1]?.token]?.price +
          data.rewards[2]?.amount * prices[data.rewards[2]?.token]?.price;
        // console.log(reward_total_usd);
        const total_fees_rewards_usd = fee_total_usd + reward_total_usd;
        // TIME CALCULATIONS
        const currentTime = new Date();
        const timeOpened = new Date(
          positions_record[data.position.address]?.time_opened
        );
        const timeHarvested = new Date(
          positions_record[data.position.address]?.time_harvested
        );
        const timeDiffOpened = currentTime.getTime() - timeOpened.getTime();
        const timeDiffHarvested =
          currentTime.getTime() -
          Math.max(timeOpened.getTime(), timeHarvested?.getTime());
        const daysOpen = timeDiffOpened / (1000 * 3600 * 24);
        const daysHarvested = timeDiffHarvested / (1000 * 3600 * 24);
        // YIELD CALCULATIONS
        const yield_avg_usd_day =
          total_fees_rewards_usd / (daysHarvested ? daysHarvested : daysOpen);
        const yield_avg_percent_day =
          (yield_avg_usd_day / position_usd_total) * 100;
        // PRINTED TABLE
        console.table({
          [`Pool`]: `${poolSettings.name} (${
            poolSettings.feePct
          }% fee pool) (Opened: ${Math.floor(
            timeDiffOpened / (1000 * 60 * 60)
          )} hrs and ${Math.floor(
            (timeDiffOpened % (1000 * 60 * 60)) / (1000 * 60)
          )} mins ago)`,
          [`Yield`]: `$${total_fees_rewards_usd?.toFixed(
            2
          )} (Avg: $${yield_avg_usd_day?.toFixed(
            2
          )} / ${yield_avg_percent_day?.toFixed(2)} % per day)${
            timeDiffHarvested
              ? ` (Harvested: ${Math.floor(
                  timeDiffHarvested / (1000 * 60 * 60)
                )} hrs and ${Math.floor(
                  (timeDiffHarvested % (1000 * 60 * 60)) / (1000 * 60)
                )} mins ago)`
              : ""
          }`,
          [`Tokens`]: `${
            TOKENS_BY_MINT[data.tokenA.mint]?.name
          }: ${data.tokenA.amount?.toFixed(2)} / ${
            TOKENS_BY_MINT[data.tokenB.mint]?.name
          }: ${data.tokenB.amount?.toFixed(2)} ($${position_usd_total?.toFixed(
            2
          )})`,
          [`Price Range`]: `${data.lower.price?.toFixed(
            5
          )} ${ratio_b_to_dashes} [${data.whirlpoolPrice?.toFixed(
            5
          )}] ${ratio_a_to_dashes} ${data.upper.price?.toFixed(5)} (${(
            ((data.upper.price - data.lower.price) / data.lower.price) *
            100
          )?.toFixed(3)}% range)`,
          [`Whirlpool Address`]: `${data.whirlpoolAddress}`,
          [`Position Address`]: `${data.position.address}`,
        });
      });
    }
    return;
  } catch (error) {
    console.log(`Print Status Error: Skipping status print... ${error}`);
    return;
  }
}
