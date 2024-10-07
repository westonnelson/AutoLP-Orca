import { buildVersionedTransaction } from "../utils/buildVersionedTransaction.js";
import { closePositionNoHarvest } from "../functions/closePositionNoHarvest.js";
import { sendJitoTransaction } from "../functions/sendJitoTransaction.js";

export async function closePosition(
  position_address: string,
  JITO_TIP?: number
) {
  try {
    while (true) {
      const ix = await closePositionNoHarvest(position_address);
      const tx = await buildVersionedTransaction(ix!);
      const jito_status = await sendJitoTransaction([tx], JITO_TIP);
      if (jito_status === 1) {
        continue;
      }
      console.log("Close Position: Position closed!");
      return;
    }
  } catch (error) {
    console.log(`Close Position Error, retrying in 5 seconds...: ${error}`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return closePosition(position_address, JITO_TIP);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.error("Please provide a position address as an argument.");
      process.exit(1);
    }
    const position_address = args[0];
    await closePosition(position_address);
  })();
}
