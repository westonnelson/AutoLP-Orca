import { harvestFeesBundle } from "../functions/harvestFeesBundle.js";
import { buildVersionedTransaction } from "../functions/index.js";
import { sendJitoTransaction } from "../functions/sendJitoTransaction.js";

export async function harvestFees(position_address: string) {
  try {
    while (true) {
      const ix = await harvestFeesBundle(position_address);
      const tx = await buildVersionedTransaction(ix!);
      const status = await sendJitoTransaction([tx]);
      if (status === 1) {
        continue;
      }
      console.log("Harvested fees!");
      return;
    }
  } catch (error) {
    console.log(`Harvest Fees Error: Retrying in 5 seconds... ${error}`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return harvestFees(position_address);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const args = process.argv.slice(2);
    if (args.length < 1) {
      console.error("Please provide a position address as an argument.");
      process.exit(1);
    }
    const position_address = args[0];
    await harvestFees(position_address);
  })();
}
