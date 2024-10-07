import { PublicKey } from "@solana/web3.js";
import anchor from "@coral-xyz/anchor";
const { BN } = anchor;
import {
  increaseLiquidityQuoteByInputTokenWithParams,
  TokenExtensionUtil,
} from "@orca-so/whirlpools-sdk";
import { Instruction, Percentage } from "@orca-so/common-sdk";

// local functions
import { getCtx, getClient } from "./index.js";
import { TOKENS_BY_MINT } from "../config/index.js";

export async function increaseLiquidityBundle(
  position_pubkey: PublicKey,
  input_token: PublicKey,
  input_amount: number
): Promise<Instruction[]> {
  try {
    input_amount = Math.floor(
      input_amount * 10 ** TOKENS_BY_MINT[input_token.toBase58()].decimals
    );
    const ctx = await getCtx();
    const client = await getClient();
    // Get the pools to which the positions belong
    const position = await client.getPosition(position_pubkey);
    const whirlpool = await client.getPool(position.getData().whirlpool);

    // Obtain quote
    const whirlpool_data = whirlpool.getData();
    const token_a = whirlpool.getTokenAInfo();
    const token_b = whirlpool.getTokenBInfo();

    // slippage
    const slippage = Percentage.fromFraction(20, 1000); // 10 == 1%

    const quote = increaseLiquidityQuoteByInputTokenWithParams({
      // Pass the pool definition and state
      tokenMintA: token_a.mint,
      tokenMintB: token_b.mint,
      sqrtPrice: whirlpool_data.sqrtPrice,
      tickCurrentIndex: whirlpool_data.tickCurrentIndex,
      // Price range
      tickLowerIndex: position.getData().tickLowerIndex,
      tickUpperIndex: position.getData().tickUpperIndex,
      // Input token and amount
      inputTokenMint: input_token,
      inputTokenAmount: new BN(input_amount * 0.98), // match slippage amount (plus a little for price discrepency?)
      // Acceptable slippage
      slippageTolerance: slippage,
      // Get token info for TokenExtensions
      tokenExtensionCtx:
        await TokenExtensionUtil.buildTokenExtensionContextForPool(
          ctx.fetcher,
          token_a.mint,
          token_b.mint
        ),
    });

    // Create a transaction (After opening BundledPosition, it can be operated in the same way as a normal position)
    const increase_liquidity_tx = await position.increaseLiquidity(quote);
    return [increase_liquidity_tx.compressIx(false)];
  } catch (error) {
    console.log(error);
    return increaseLiquidityBundle(position_pubkey, input_token, input_amount);
  }
}
