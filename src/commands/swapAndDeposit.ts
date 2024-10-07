import { CONFIG, POOL_SETTINGS, TOKENS_BY_NAME } from "../config/index.js";
import {
  fetchWhirlpoolsDataBundle,
  sendJitoTransaction,
} from "../functions/index.js";
import { deposit } from "./deposit.js";
import {
  fetchJupiterSwapQuote,
  createJupiterSwapTx,
  fetchTokenPricesJup,
  getWalletBalance,
  calcRatioSwap,
} from "../utils/index.js";
import { PositionData } from "../types/global.js";

// TODO: seperate out swap and checkWallet functions into their own files

async function swap(
  position_data: any,
  calc: any,
  JITO_TIP?: number
): Promise<number> {
  try {
    const quote = await fetchJupiterSwapQuote(
      position_data!.whirlpoolAddress,
      calc.swap_in_token,
      calc.swap_out_token,
      calc.swap_amount_lamports,
      POOL_SETTINGS[position_data!.whirlpoolAddress].swapLossLimitPct
    );
    const swap_tx = await createJupiterSwapTx(quote.quote);
    const status = await sendJitoTransaction(
      [swap_tx],
      (JITO_TIP || CONFIG.JITO_TIP) + (quote.extra_tip || 0)
    );
    if (status === 1) {
      return 1;
    }
    console.log(
      "Swapped to correct ratio! Wait 10 seconds for wallet to update..."
    );
    await new Promise((resolve) => setTimeout(resolve, 10000));
    return 0;
  } catch (error) {
    console.log(`Swap: Error: ${error}`);
    console.log("Retrying in 5 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return swap(position_data, calc, JITO_TIP);
  }
}

async function checkWallet(
  position_data: any,
  verbose: boolean = false
): Promise<number> {
  try {
    let wallet_tokens = await getWalletBalance();
    const prices = await fetchTokenPricesJup([
      position_data!.tokenA.mint,
      position_data!.tokenB.mint,
      TOKENS_BY_NAME.SOL.mint.toBase58(),
    ]);
    // remove SOL reserve amount from wallet variable
    if (
      wallet_tokens![TOKENS_BY_NAME.SOL.mint.toBase58()].ui_amount >
      CONFIG.SOL_RESERVE
    ) {
      wallet_tokens![TOKENS_BY_NAME.SOL.mint.toBase58()].ui_amount -=
        CONFIG.SOL_RESERVE;
    } else {
      wallet_tokens![TOKENS_BY_NAME.SOL.mint.toBase58()].ui_amount = 0;
    }
    let total_amount =
      wallet_tokens![position_data!.tokenA.mint].ui_amount *
        prices[position_data!.tokenA.mint].price +
      wallet_tokens![position_data!.tokenB.mint].ui_amount *
        prices[position_data!.tokenB.mint].price;
    const min_deposit_amount = CONFIG.MIN_DEPOSIT_AMOUNT;
    if (total_amount > min_deposit_amount) {
      if (verbose) {
        console.log(
          `Check Wallet: total amount of $${total_amount.toFixed(
            2
          )} in wallet above $${min_deposit_amount}, swapping and depositing the remainder...`
        );
      }
      return 0; // can do another swap and deposit
    } else {
      console.log(
        `Check Wallet:total amount of both pairs in wallet is: $${total_amount.toFixed(
          2
        )}. No deposit needed.`
      );
      return 1;
    }
  } catch (error) {
    console.log(`Check Wallet Error: Retrying in 5 seconds... ${error}`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return checkWallet(position_data);
  }
}

export async function swapAndDeposit(
  whirlpool_address: string,
  JITO_TIP?: number
): Promise<number | undefined> {
  try {
    while (true) {
      // find the position
      let positions_data = await fetchWhirlpoolsDataBundle();
      if (positions_data === 1) {
        console.log(
          "Swap and Deposit: no positions bundle found, try again in 30 seconds..."
        );
        await new Promise((resolve) => setTimeout(resolve, 30000));
        continue;
      } else if (positions_data === 2) {
        console.log(
          "Swap and Deposit: no open positions found, try again in 5 seconds..."
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }
      let position_data: PositionData | undefined = undefined;
      if (Array.isArray(positions_data)) {
        position_data = positions_data.find(
          (position) => position.whirlpoolAddress === whirlpool_address
        );
      } else {
        console.error(
          "Swap and Deposit: No position found for the given whirlpool address. Wait 5 more seconds for on-chain data to update and check again."
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      // Add this check
      if (!position_data) {
        console.error(
          "Swap and Deposit: No position found for the given whirlpool address. Wait 5 more seconds for on-chain data to update and check again."
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      let check = await checkWallet(position_data, true);
      if (check === 1) {
        console.log("Swap and Deposit: No need to swap and deposit right now.");
        return 0;
      }
      // calculate the swap amount
      const calc = await calcRatioSwap(position_data);
      if (calc === 1) {
        console.log(
          "Swap and Deposit: position out of bounds, needs rebalanced"
        );
        return 1;
      }
      // ratio good, no swap needed
      if (calc === 2) {
        console.log(
          "Swap and Deposit: wallet ratio the same as pool, no swap needed, depositing..."
        );
        const deposit_status = await deposit(whirlpool_address, JITO_TIP);
        if (deposit_status === 1) {
          return; // deposit was 0, wouldn't work
        }
        console.log(
          "Swap and Deposit: Waiting 5 seconds for chain to update..."
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        check = await checkWallet(position_data);
        if (check === 0) {
          console.log(
            "Swap and Deposit: can swap again, swapping and depositing..."
          );
          continue;
        } else {
          console.log("Swap and Deposit: No need to swap and deposit again.");
          return;
        }
      }
      // swap needed:
      console.log("Swap and Deposit: swapping...");
      const swap_status = await swap(position_data, calc, JITO_TIP);
      if (swap_status === 1) {
        continue;
      }
      console.log("Swap and Deposit: depositing...");
      const deposit_status = await deposit(whirlpool_address, JITO_TIP);
      if (deposit_status === 1) {
        return; // deposit was 0, wouldn't work
      }
      console.log("Swap and Deposit: Waiting 5 seconds for chain to update...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      check = await checkWallet(position_data);
      if (check === 0) {
        console.log(
          "Swap and Deposit: Can swap again, swapping and depositing..."
        );
        continue;
      } else {
        console.log("Swap and Deposit: No need to swap and deposit again.");
        return 0;
      }
    }
  } catch (error) {
    console.log(`Swap And Deposit Error: Retrying in 5 seconds... ${error}`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return swapAndDeposit(whirlpool_address, JITO_TIP);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.error(
        "Swap and Deposit: Please provide a whirlpool address as an argument."
      );
      process.exit(1);
    }
    const whirlpool_address = args[0];
    await swapAndDeposit(whirlpool_address);
  })();
}
