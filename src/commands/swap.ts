// TODO: seperate swap function from SwapAndDeposit

// import { POOL_SETTINGS } from "./data/POOL_SETTINGS.js";
// import { TOKENS_BY_MINT } from "./data/TOKENS.js";
// import { sendJitoTransaction } from "./functions/sendJitoTransaction.js";
// import {
//   fetchJupiterSwapQuote,
//   createJupiterSwapTx,
// } from "./utils/jupiterSwap.js";

// export async function swap(
//   whirlpool_address: any,
//   swap_in_token: any,
//   swap_out_token: any,
//   swap_amount_lamports: any,
//   JITO_TIP?: number
// ) {
//   try {
//     // console.log("swapping to correct ratio...");
//     const quote = await fetchJupiterSwapQuote(
//       whirlpool_address,
//       swap_in_token,
//       swap_out_token,
//       swap_amount_lamports,
//       POOL_SETTINGS[whirlpool_address].swapLossLimitPct,
//       POOL_SETTINGS[whirlpool_address].slippageBps || undefined
//     );
//     const swap_tx = await createJupiterSwapTx(quote.quote);
//     const status = await sendJitoTransaction(
//       [swap_tx],
//       (JITO_TIP || 50000) + (quote.extra_tip || 0)
//     );
//     if (status === 1) {
//       console.log("Blockhash expired, retrying...");
//       return 1;
//     }
//     console.log(
//       "Swapped to correct ratio! Wait 15 seconds for wallet to update..."
//     );
//     await new Promise((resolve) => setTimeout(resolve, 15000));
//     return 0;
//   } catch (error) {
//     console.log(`Swap: Error, retrying in 5 seconds...: ${error}`);
//     await new Promise((resolve) => setTimeout(resolve, 5000));
//     return swap(
//       whirlpool_address,
//       swap_in_token,
//       swap_out_token,
//       swap_amount_lamports,
//       JITO_TIP
//     );
//   }
// }

// if (import.meta.url === `file://${process.argv[1]}`) {
//   (async () => {
//     const args = process.argv.slice(2);
//     if (args.length === 0) {
//       console.error(
//         "Swap: Please provide a whirlpool address, swap in token, swap out token, and swap amount (ui) as arguments."
//       );
//       process.exit(1);
//     }
//     const whirlpool_address = args[0];
//     const swap_in_token = args[1];
//     const swap_out_token = args[2];
//     const swap_amount_lamports =
//       Number(args[3]) * 10 ** TOKENS_BY_MINT[swap_in_token].decimals;

//     await swap(
//       whirlpool_address,
//       swap_in_token,
//       swap_out_token,
//       swap_amount_lamports
//     );
//   })();
// }
