// TODO: complete open and increase/deposit to position via one transaction

// import { PublicKey } from "@solana/web3.js";
// import { getAssociatedTokenAddressSync } from "@solana/spl-token";
// import anchor from "@coral-xyz/anchor";
// const { BN } = anchor;
// import {
//   PDAUtil,
//   PriceMath,
//   IGNORE_CACHE,
//   PositionBundleUtil,
//   WhirlpoolIx,
//   increaseLiquidityQuoteByInputTokenWithParams,
//   TokenExtensionUtil,
// } from "@orca-so/whirlpools-sdk";
// import { Decimal } from "decimal.js";

// // local functions
// import { getCtx, getClient } from "./index.js";
// import { ACCOUNTS, POOL_SETTINGS, TOKENS_BY_NAME } from "../data/index.js";
// import {
//   createJupiterSwapTx,
//   fetchJupiterSwapQuote,
//   getWalletBalance,
// } from "../utils/index.js";

// import { Instruction, Percentage } from "@orca-so/common-sdk";
// import { buildVersionedTransaction, sendJitoTransaction } from "./index.js";

// export async function openAndIncreasePositionBundle(whirlpool_address: string) {
//   const ctx = getCtx();
//   const client = getClient();
//   // Retrieve the position bundle address
//   const position_bundle_address = ACCOUNTS.POSITION_BUNDLE.ADDRESS;
//   const position_bundle_mint = ACCOUNTS.POSITION_BUNDLE.MINT;
//   const position_bundle_token_account = ACCOUNTS.POSITION_BUNDLE.TOKEN_ACCOUNT;
//   const position_bundle_pubkey = new PublicKey(position_bundle_address);
//   //   console.log("position bundle address:", position_bundle_pubkey.toBase58());
//   // Get whirlpool
//   const whirlpool_pubkey = new PublicKey(whirlpool_address);
//   //   console.log("whirlpool_key:", whirlpool_pubkey.toBase58());
//   const whirlpool = await client.getPool(whirlpool_pubkey);

//   // Get the current price of the pool
//   const sqrt_price_x64 = whirlpool.getData().sqrtPrice;
//   const price = PriceMath.sqrtPriceX64ToPrice(
//     sqrt_price_x64,
//     whirlpool.getTokenAInfo().decimals,
//     whirlpool.getTokenBInfo().decimals
//   );
//   // Set price range
//   const lower_price = new Decimal(
//     new Decimal(price)
//       .times(
//         new Decimal(1).minus(
//           new Decimal(
//             POOL_SETTINGS[whirlpool.getAddress().toBase58()].rangePct
//           ).dividedBy(2)
//         )
//       )
//       .toNumber()
//   );
//   const upper_price = new Decimal(
//     new Decimal(price)
//       .times(
//         new Decimal(1).plus(
//           new Decimal(
//             POOL_SETTINGS[whirlpool.getAddress().toBase58()].rangePct
//           ).dividedBy(2)
//         )
//       )
//       .toNumber()
//   );

//   // Adjust price range (not all prices can be set, only a limited number of prices are available for range specification)
//   // (prices corresponding to InitializableTickIndex are available)
//   const whirlpool_data = whirlpool.getData();
//   const token_a = whirlpool.getTokenAInfo();
//   const token_b = whirlpool.getTokenBInfo();
//   const lower_tick_index = PriceMath.priceToInitializableTickIndex(
//     lower_price,
//     token_a.decimals,
//     token_b.decimals,
//     whirlpool_data.tickSpacing
//   );
//   const upper_tick_index = PriceMath.priceToInitializableTickIndex(
//     upper_price,
//     token_a.decimals,
//     token_b.decimals,
//     whirlpool_data.tickSpacing
//   );

//   // get deposit ratios
//   // next bits from https://github.com/everlastingsong/solsandbox/blob/main/orca/whirlpool/whirlpools_sdk/78a_deposit_ratio.ts
//   // get sqrt prices
//   const lower_sqrt_price = Math.sqrt(
//     PriceMath.tickIndexToPrice(
//       lower_tick_index,
//       token_a.decimals,
//       token_b.decimals
//     ).toNumber()
//   );
//   const upper_sqrt_price = Math.sqrt(
//     PriceMath.tickIndexToPrice(
//       upper_tick_index,
//       token_a.decimals,
//       token_b.decimals
//     ).toNumber()
//   );
//   const clamped_current_sqrt_price = Math.min(
//     Math.max(lower_sqrt_price, Math.sqrt(price.toNumber())),
//     upper_sqrt_price
//   );

//   // calc ratio (L: liquidity)
//   // deposit_a = L/current_sqrt_price - L/upper_sqrt_price
//   // deposit_b = L*current_sqrt_price - L*lower_sqrt_price
//   const deposit_a = 1 / clamped_current_sqrt_price - 1 / upper_sqrt_price;
//   const deposit_b = clamped_current_sqrt_price - lower_sqrt_price;
//   const deposit_a_value_in_b = deposit_a * price.toNumber();
//   const deposit_b_value_in_b = deposit_b;
//   const total_value_in_b = deposit_a_value_in_b + deposit_b_value_in_b;
//   const desired_ratio_a = deposit_a_value_in_b / total_value_in_b;
//   const desired_ratio_b = deposit_b_value_in_b / total_value_in_b;

//   const tokens_in_wallet = await getWalletBalance();
//   // check if token_a is SOL, a reversed pool, and if so set it as vs_token, not token_b
//   const vs_token =
//     token_a.mint.toString() == TOKENS_BY_NAME.SOL.mint.toString()
//       ? token_a
//       : token_b;
//   const input_token =
//     token_a.mint.toString() == TOKENS_BY_NAME.SOL.mint.toString()
//       ? token_b
//       : token_a;
//   const vs_token_balance =
//     tokens_in_wallet[vs_token.mint.toString()].amount || 0;
//   const input_token_balance =
//     tokens_in_wallet[input_token.mint.toString()].amount || 0;
//   if (vs_token_balance === 0) {
//     throw new Error(
//       "No token_b in wallet! for ratio swap. Skipping opening position, needs diagnosis"
//     );
//   }
//   // if vs_token is SOL, subtract 0.3 SOL from the balance to leave some for fees
//   const amount_to_swap =
//     vs_token.mint.toString() == TOKENS_BY_NAME.SOL.mint.toString()
//       ? Math.floor((vs_token_balance - 0.3 * 10 ** 9) * desired_ratio_b)
//       : Math.floor(vs_token_balance * desired_ratio_a);

//   // get swap quote
//   const swap_quote = await fetchJupiterSwapQuote(
//     vs_token.mint.toBase58(),
//     input_token.mint.toBase58(),
//     amount_to_swap,
//     POOL_SETTINGS[whirlpool_address].feePct
//   );
//   if (swap_quote === 1) {
//     console.log("Swap quote exceeded loss limit, restarting...");
//     return openAndIncreasePositionBundle(whirlpool_address);
//   }
//   // create swap tx
//   const swap_tx = await createJupiterSwapTx(swap_quote);

//   // get a new quote with the correct amount of input token
//   const quote = increaseLiquidityQuoteByInputTokenWithParams({
//     // Pass the pool definition and state
//     tokenMintA: token_a.mint,
//     tokenMintB: token_b.mint,
//     sqrtPrice: whirlpool_data.sqrtPrice,
//     tickCurrentIndex: whirlpool_data.tickCurrentIndex,
//     // Price range
//     tickLowerIndex: lower_tick_index,
//     tickUpperIndex: upper_tick_index,
//     // Input token and amount
//     inputTokenMint: input_token.mint,
//     inputTokenAmount: new BN(parseInt(swap_quote.otherAmountThreshold) * 0.975),
//     // Acceptable slippage
//     slippageTolerance: Percentage.fromFraction(25, 1000),
//     // Get token info for TokenExtensions
//     tokenExtensionCtx:
//       await TokenExtensionUtil.buildTokenExtensionContextForPool(
//         ctx.fetcher,
//         token_a.mint,
//         token_b.mint
//       ),
//   });

//   // Get PositionBundle account
//   const position_bundle = await ctx.fetcher.getPositionBundle(
//     position_bundle_pubkey,
//     IGNORE_CACHE
//   );

//   // Get ATA for PositionBundle
//   // ensure position bundle exists
//   if (!position_bundle) {
//     console.log("position bundle not found!");
//     console.dir(position_bundle, { depth: null });
//     return;
//   }

//   // Get unused bundle indexes in PositionBundle
//   const unoccupied_bundle_indexes =
//     PositionBundleUtil.getUnoccupiedBundleIndexes(position_bundle);

//   // Generate address for positions managed by PositionBundle
//   const bundled_position_pda = PDAUtil.getBundledPosition(
//     ctx.program.programId,
//     new PublicKey(position_bundle_mint),
//     unoccupied_bundle_indexes[0]
//   );

//   // console.log(
//   //   `bundled position one (${unoccupied_bundle_indexes[0]}) pubkey:`,
//   //   bundled_position_one_pda.publicKey.toBase58()
//   // );

//   const open_position_tx = await whirlpool.openPositionWithMetadata(
//     lower_tick_index,
//     upper_tick_index,
//     quote,
//     bundled_position_pda.publicKey
//   );

//   const open_position_ix = open_position_tx.tx.compressIx(false);

//   return { swap_tx, open_position_ix };
// }
