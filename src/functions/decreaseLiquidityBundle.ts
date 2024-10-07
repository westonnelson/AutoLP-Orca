import { PublicKey } from "@solana/web3.js";
import anchor from "@coral-xyz/anchor";
const { BN } = anchor;
import {
  DecreaseLiquidityQuote,
  decreaseLiquidityQuoteByLiquidityWithParams,
  Position,
  TokenExtensionUtil,
  Whirlpool,
  WhirlpoolData,
} from "@orca-so/whirlpools-sdk";
import {
  Percentage,
  Instruction,
  TransactionBuilder,
} from "@orca-so/common-sdk";

// local functions
import { getCtx, getClient } from "./index.js";

export async function decreaseLiquidityBundle(
  position_address: string,
  withdraw_pct: number
): Promise<Instruction | undefined> {
  try {
    const ctx = await getCtx();
    const client = await getClient();
    // Get the pools to which the positions belong
    const position: Position = await client.getPosition(
      new PublicKey(position_address)
    );
    const whirlpool: Whirlpool = await client.getPool(
      position.getData().whirlpool
    );

    const liquidity = position.getData().liquidity;
    const delta_liquidity = liquidity
      .mul(new BN(Math.round(withdraw_pct * 100)))
      .div(new BN(10000));

    // Set acceptable slippage
    const slippage: Percentage = Percentage.fromFraction(10, 1000); // 1%

    // Obtain quote
    const whirlpool_data: WhirlpoolData = whirlpool.getData();
    const quote: DecreaseLiquidityQuote =
      decreaseLiquidityQuoteByLiquidityWithParams({
        // Pass the pool definition and state
        sqrtPrice: whirlpool_data.sqrtPrice,
        tickCurrentIndex: whirlpool_data.tickCurrentIndex,
        // Price range
        tickLowerIndex: position.getData().tickLowerIndex,
        tickUpperIndex: position.getData().tickUpperIndex,
        // liquidity to withdraw
        liquidity: delta_liquidity,
        // Acceptable slippage
        slippageTolerance: slippage,
        // Get token info for TokenExtensions
        tokenExtensionCtx: await TokenExtensionUtil.buildTokenExtensionContext(
          ctx.fetcher,
          whirlpool_data
        ),
      });

    // Create a transaction (After opening BundledPosition, it can be operated in the same way as a normal position)
    const decrease_liquidity_tx: TransactionBuilder =
      await position.decreaseLiquidity(quote);
    const ix = decrease_liquidity_tx.compressIx(false);
    return ix;
  } catch (error) {
    console.log(error);
    return decreaseLiquidityBundle(position_address, withdraw_pct);
  }
}
