import { PublicKey } from "@solana/web3.js";
import { buildVersionedTransaction } from "../utils/buildVersionedTransaction.js";
import { fetchWhirlpoolsDataBundle } from "../functions/fetchWhirlpoolData.js";
import { increaseLiquidityBundle } from "../functions/increaseLiquidityBundle.js";
import { sendJitoTransaction } from "../functions/sendJitoTransaction.js";
import { getWalletBalance } from "../utils/getWalletBalance.js";
import { fetchTokenPricesJup } from "../utils/index.js";
import { TOKENS_BY_NAME, CONFIG } from "../config/index.js";

export async function deposit(whirlpool_address: string, JITO_TIP?: number) {
  try {
    while (true) {
      const position_data = await fetchWhirlpoolsDataBundle(
        false,
        whirlpool_address
      );
      if (position_data === 1) {
        console.log("no positions bundle found");
        process.exit(1);
      } else if (position_data === 2) {
        console.log("no open positions found");
        process.exit(1);
      }
      let wallet_tokens = await getWalletBalance();
      if (!Array.isArray(position_data)) {
        throw new Error("position_data is not an array");
      }
      const token_prices = await fetchTokenPricesJup([
        position_data[0].tokenA.mint,
        position_data[0].tokenB.mint,
      ]);
      // remove SOL reserve from wallet variable
      if (
        wallet_tokens![TOKENS_BY_NAME.SOL.mint.toBase58()].ui_amount >
        CONFIG.SOL_RESERVE
      ) {
        wallet_tokens![TOKENS_BY_NAME.SOL.mint.toBase58()].ui_amount -=
          CONFIG.SOL_RESERVE;
      } else {
        wallet_tokens![TOKENS_BY_NAME.SOL.mint.toBase58()].ui_amount = 0;
      }
      let token_a_amount =
        wallet_tokens![position_data![0].tokenA.mint].ui_amount! *
        token_prices[position_data![0].tokenA.mint].price;
      let token_b_amount =
        wallet_tokens![position_data![0].tokenB.mint].ui_amount! *
        token_prices[position_data![0].tokenB.mint].price;

      // fix in case i have zero of a token (should never occur)
      let ratio_a_wallet;
      if (token_a_amount === 0) {
        ratio_a_wallet = 0;
      } else if (token_b_amount === 0) {
        ratio_a_wallet = 1;
      } else {
        ratio_a_wallet = token_a_amount / (token_b_amount + token_a_amount);
      }

      const deposit_token =
        ratio_a_wallet > position_data![0].tokenA.ratio
          ? position_data![0].tokenB.mint
          : position_data![0].tokenA.mint;
      const deposit_amount = wallet_tokens![deposit_token].ui_amount!;
      if (token_a_amount === 0 || token_b_amount === 0) {
        // this really should never happen
        console.log(
          "Deposit: Either token a or token b amount is 0. Exit and try again on next cycle."
        );
        return 1;
      }
      const deposit_ix = await increaseLiquidityBundle(
        position_data![0].position.address,
        new PublicKey(deposit_token),
        deposit_amount
      );
      // await testTransaction(deposit_ix);
      const deposit_tx = await buildVersionedTransaction(deposit_ix!);
      const status = await sendJitoTransaction([deposit_tx], JITO_TIP);
      if (status === 1) {
        // console.log("Deposit: Blockhash expired, retrying...");
        continue;
      }
      console.log("Deposit: Deposited to position!");
      return 0;
    }
  } catch (error) {
    console.log(`Deposit Error: Retrying in 5 seconds... ${error}`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return deposit(whirlpool_address, JITO_TIP);
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
    await deposit(whirlpool_address);
  })();
}
