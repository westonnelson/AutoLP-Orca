// Program Functions
import {
  checkPosition,
  fetchWhirlpoolsDataBundle,
  printStatusMin,
  swapAndDeposit,
} from "./functions/index.js";
import { connectJitoTipsWS } from "./utils/index.js";
import { POOL_SETTINGS } from "./config/index.js";
import { openPosition } from "./commands/openPosition.js";
import { closePosition } from "./commands/closePosition.js";
import { CONFIG } from "./config/index.js";

// Jito Tips WebSocket
let JITO_TIP: number = CONFIG.JITO_TIP;
connectJitoTipsWS((parsedMessage) => {
  if (
    parsedMessage[0] &&
    parsedMessage[0].landed_tips_75th_percentile !== undefined
  ) {
    JITO_TIP = Math.round(
      parsedMessage[0].landed_tips_75th_percentile * 10 ** 9
    );
    JITO_TIP < 50000 ? (JITO_TIP = 50000) : JITO_TIP;
    JITO_TIP > 100000 ? (JITO_TIP = 100000) : JITO_TIP;
  } else {
    console.warn(
      "Jito Tips WS: Received message with undefined:",
      parsedMessage
    );
  }
});

// main function watches positions and rebalances them if needed.
async function main() {
  try {
    // fetch pool position data
    const positions_data = await fetchWhirlpoolsDataBundle();
    if (positions_data === 1) {
      console.log("Main: No positions bundle found, retrying on next run...");
    } else if (positions_data === 2) {
      console.log("Main: No open positions found, retrying on next run...");
    } else if (Array.isArray(positions_data)) {
      // loop through all positions and check if they need to be rebalanced
      for (let index = 0; index < positions_data.length; index++) {
        const poolSettings =
          POOL_SETTINGS[positions_data[index].whirlpoolAddress];
        if (await checkPosition(positions_data[index])) {
          console.log(
            `Main: Rebalancing: ${poolSettings.name} (range: ${
              poolSettings.rangePct * 100
            }%)`
          );
          await closePosition(
            positions_data[index].position.address.toString(),
            JITO_TIP
          );
          await openPosition(positions_data[index].whirlpoolAddress, JITO_TIP);
          console.log(
            "Main: Position opened, waiting 10 seconds for chain to update"
          );
          await new Promise((resolve) => setTimeout(resolve, 10000));
          const status = await swapAndDeposit(
            positions_data[index].whirlpoolAddress,
            JITO_TIP
          );
          if (status === 1) {
            console.log(
              "Main: Position out of bounds, needs rebalanced on next run, skipping to next position..."
            );
            continue;
          } else {
            console.log(
              `Main: ${poolSettings.name} rebalance complete. Checking next position...`
            );
          }
        } else {
        }
      }
      // print final status report
      console.log("Main: Positions in range...");
      await printStatusMin();
    }
  } catch (error) {
    console.error(
      `Main: Error, program will run again in ${CONFIG.RERUN_MINUTES} minutes:`,
      error
    );
  } finally {
    // Schedule the next run after 10 minutes
    if (CONFIG.RERUN) {
      setTimeout(main, CONFIG.RERUN_MINUTES * 60 * 1000);
    }
  }
}

await main();
