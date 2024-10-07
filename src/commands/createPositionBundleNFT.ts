import { createPositionBundleNFT } from "../functions/index.js";
import { buildVersionedTransaction } from "../utils/buildVersionedTransaction.js";
import { sendJitoTransaction } from "../functions/sendJitoTransaction.js";

async function createPositionNFT(JITO_TIP?: number) {
  try {
    while (true) {
      const ix = await createPositionBundleNFT();
      const tx = await buildVersionedTransaction([ix!]);
      const jito_status = await sendJitoTransaction([tx], JITO_TIP);
      if (jito_status === 1) {
        continue;
      }
      console.log(
        "Create Position NFT: Position NFT created! Review your transaction on Solscan to retrieve relevantaddresses."
      );
      return;
    }
  } catch (error) {
    console.log(
      `Create Position NFT Error, retrying in 5 seconds...: ${error}`
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return createPositionNFT(JITO_TIP);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await createPositionNFT();
  })();
}
