import { TOKENS_BY_MINT, TOKENS_BY_NAME } from "../config/index.js";
import { getWalletBalance, fetchTokenPricesJup } from "./index.js";
import { CONFIG } from "../config/index.js";

export async function calcRatioSwap(pool_info: any): Promise<
  | number
  | undefined
  | {
      swap_in_token: string;
      swap_out_token: string;
      swap_amount_lamports: number;
      token_b: string;
      token_b_final_amount: number;
    }
> {
  // fetch fresh pool data
  // const pool_info = await fetchWhirlpoolsDataBundle(whirlpool_address);
  if (pool_info === 1) {
    console.log("no positions bundle found");
    return;
  } else if (pool_info === 2) {
    console.log("no open positions found");
    return;
  }
  // define pool info
  const ratio_a_position = pool_info.tokenA.ratio;
  const ratio_b_position = pool_info.tokenB.ratio;
  if (ratio_a_position >= 1 || ratio_b_position >= 1) {
    return 1; // pool is out of bounds, needs rebalanced
  }
  const token_a = pool_info.tokenA.mint;
  const token_b = pool_info.tokenB.mint;

  // fetch wallet balance
  let wallet_tokens = await getWalletBalance();
  // remove SOL reserve amount from wallet variable
  if (
    wallet_tokens![TOKENS_BY_NAME.SOL.mint.toBase58()].ui_amount >
    CONFIG.SOL_RESERVE
  ) {
    wallet_tokens![TOKENS_BY_NAME.SOL.mint.toBase58()].ui_amount -=
      CONFIG.SOL_RESERVE;
  } else {
    wallet_tokens![TOKENS_BY_NAME.SOL.mint.toBase58()].ui_amount = 0;
  }
  const token_a_wallet_balance = wallet_tokens![token_a].ui_amount;
  const token_b_wallet_balance = wallet_tokens![token_b].ui_amount;
  // calculate ratio in wallet
  const token_prices = await fetchTokenPricesJup([token_a, token_b], true);
  const token_a_usd_wallet =
    token_a_wallet_balance * token_prices[token_a].price;
  const token_b_usd_wallet =
    token_b_wallet_balance * token_prices[token_b].price;
  const total_wallet_value = token_a_usd_wallet + token_b_usd_wallet;

  // fix for ratio in case i have zero of a token
  let ratio_a_wallet;
  if (token_a_wallet_balance === 0) {
    ratio_a_wallet = 0;
  } else if (token_b_wallet_balance === 0) {
    ratio_a_wallet = 1;
  } else {
    ratio_a_wallet = token_a_usd_wallet / total_wallet_value;
  }

  // only skip if i have more than zero of a token in wallet (need more than zero for deposits)
  if (
    Math.abs(ratio_a_wallet - ratio_a_position) <= 0.02 &&
    token_a_wallet_balance > 1 &&
    token_b_wallet_balance > 1
  ) {
    return 2; // wallet ratio is within 2% of pool ratio, no swap needed
  }

  // calculate which token to swap and swap amount
  const swap_in_token = ratio_a_wallet > ratio_a_position ? token_a : token_b;
  const swap_out_token = swap_in_token == token_a ? token_b : token_a;
  const target_ratio =
    swap_in_token == token_a ? ratio_a_position : ratio_b_position;
  const current_amount_wallet =
    swap_in_token == token_a ? token_a_usd_wallet : token_b_usd_wallet;
  const swap_amount = current_amount_wallet - total_wallet_value * target_ratio;
  const swap_amount_lamports = Math.round(
    (swap_amount / token_prices[swap_in_token].price) *
      10 ** TOKENS_BY_MINT[swap_in_token].decimals
  );
  const token_b_final_amount = Math.round(
    ((total_wallet_value * ratio_b_position) / token_prices[token_b].price) *
      10 ** TOKENS_BY_MINT[token_b].decimals
  );

  return {
    swap_in_token,
    swap_out_token,
    swap_amount_lamports,
    token_b,
    token_b_final_amount,
  };
}
