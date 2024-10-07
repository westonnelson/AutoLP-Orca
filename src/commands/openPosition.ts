import {
  buildVersionedTransaction,
  openPositionBundle,
  sendJitoTransaction,
} from "../functions/index.js";

export async function openPosition(
  whirlpool_address: string,
  // start_price?: number,
  JITO_TIP?: number
) {
  try {
    while (true) {
      console.log("Open Position: Opening new position...");
      // open new position
      const ix = await openPositionBundle(whirlpool_address);
      const tx = await buildVersionedTransaction(ix);
      const jito_status = await sendJitoTransaction([tx], JITO_TIP);
      if (jito_status === 1) {
        continue;
      }
      return;
    }
  } catch (error) {
    console.log(`Open Position: Error, retrying in 5 seconds: ${error}`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return openPosition(whirlpool_address, JITO_TIP);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const args = process.argv.slice(2);
    if (args.length < 1) {
      console.error(
        "Open Position: Please provide a whirlpool address as an argument and optionally a starting mid-price."
      );
      process.exit(1);
    }
    const whirlpool_address = args[0];
    const start_price = args[1] ? Number(args[1]) : undefined;
    await openPosition(whirlpool_address, start_price);
  })();
}
