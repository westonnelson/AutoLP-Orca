import { buildVersionedTransaction } from "../utils/buildVersionedTransaction.js";
import { decreaseLiquidityBundle } from "../functions/decreaseLiquidityBundle.js";
import { sendJitoTransaction } from "../functions/sendJitoTransaction.js";

export async function decreaseLiquidity(
  position_address: string,
  amount_pct: number
) {
  try {
    while (true) {
      const ix = await decreaseLiquidityBundle(position_address, amount_pct);
      if (!ix) {
        console.log("Decrease Liquidity: No instructions found, retrying...");
        continue;
      }
      const tx = await buildVersionedTransaction([ix]);
      const status = await sendJitoTransaction([tx]);
      if (status === 1) {
        continue;
      }
      console.log("Decrease Liquidity: Decreased liquidity!");
      return;
    }
  } catch (error) {
    console.log(`Decrease Liquidity Error: Retrying in 5 seconds... ${error}`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return decreaseLiquidity(position_address, amount_pct);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const args = process.argv.slice(2);
    if (args.length === 0 || args.length === 1) {
      console.error(
        "Decrease Liquidity: Please provide a position address and amount (as percent, such as 10 for 10%) as arguments."
      );
      process.exit(1);
    }
    const position_address = args[0];
    const amount_pct = parseInt(args[1]);
    await decreaseLiquidity(position_address, amount_pct);
  })();
}
