import { VersionedTransaction } from "@solana/web3.js";
import { PriceMath } from "@orca-so/whirlpools-sdk";
import { wallet, getClient } from "../functions/index.js";
import { TOKENS_BY_MINT, ACCOUNTS } from "../config/index.js";
const JUP_API = ACCOUNTS.JUPITER_API;

// fetch a price swap quote from Jupiter API
export async function fetchJupiterSwapQuote(
  whirlpool_address: string,
  tokenIn: string,
  tokenOut: string,
  amount_lamports: number,
  swap_loss_limit_pct: number
) {
  try {
    const SLIPPAGE = 0;
    const URL = `${JUP_API}/quote?inputMint=${tokenIn}&outputMint=${tokenOut}&amount=${amount_lamports}&swapMode=ExactIn&slippageBps=${SLIPPAGE}`;
    let extra_tip = 0;

    // get current whirlpool data
    const client = await getClient();
    const whirlpool = await client.getPool(whirlpool_address);
    const token_a = whirlpool.getTokenAInfo();
    const token_b = whirlpool.getTokenBInfo();

    // pool prices: token a in terms of token b and vice-versa
    const priceA = Number(
      PriceMath.sqrtPriceX64ToPrice(
        whirlpool.getData().sqrtPrice,
        token_a.decimals,
        token_b.decimals
      )
    );
    const priceB = 1 / priceA;

    // fetch swap quote
    const response = await fetch(URL);
    let data = await response.json();
    if (!data) {
      throw new Error(`Jupiter Swap Quote: Error! Data Undefined: ${response}`);
    }
    if (data.errorCode === "COULD_NOT_FIND_ANY_ROUTE") {
      throw new Error(
        `Jupiter Swap Quote: Error! No routes found: ${response}`
      );
    }
    // convert in and out amounts to readable format
    const in_amount_ui =
      Number(data.inAmount) / 10 ** TOKENS_BY_MINT[tokenIn].decimals;
    const out_amount_ui =
      Number(data.outAmount) / 10 ** TOKENS_BY_MINT[tokenOut].decimals;

    // Calculate expected out amount based on pool price and zero loss swap
    const expected_out_amount_ui =
      in_amount_ui * (tokenIn === token_a.mint.toString() ? priceA : priceB);

    // Define minimum acceptable output based on swap_loss_limit_pct
    const min_out_amount_ui =
      expected_out_amount_ui * (1 - swap_loss_limit_pct);
    const min_out_amount_lamports = Math.round(
      min_out_amount_ui * 10 ** TOKENS_BY_MINT[tokenOut].decimals
    );

    // some test output
    // console.log("in_amount_ui", in_amount_ui);
    // console.log("out_amount_ui", out_amount_ui);
    // console.log("expected_out_amount_ui", expected_out_amount_ui);
    // console.log("min_out_amount_ui", min_out_amount_ui);
    // console.log("min_out_amount_lamports", min_out_amount_lamports);

    // swap is too small
    if (out_amount_ui < min_out_amount_ui) {
      await new Promise((resolve) => setTimeout(resolve, 2500)); // wait 2.5 seconds before retrying
      return fetchJupiterSwapQuote(
        whirlpool_address,
        tokenIn,
        tokenOut,
        Math.round(amount_lamports * 0.25),
        swap_loss_limit_pct
      );
      // if swap out is more than limit:
    } else {
      console.log(
        `Jupiter Swap Quote: Output of ${out_amount_ui.toFixed(
          4
        )} is acceptable (minimum: ${min_out_amount_ui.toFixed(
          4
        )}). Proceeding with transaction...`
      );
      // set slippage to minimum acceptable output as defined in pool_settings
      data.otherAmountThreshold = min_out_amount_lamports.toString();
      // console.dir(data, { depth: null });
      return { quote: data, extra_tip: extra_tip };
    }
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage.includes("Rate limit")) {
      console.info(
        "Jupiter Swap Quote: Rate limited, waiting 10 seconds and retrying..."
      );
    } else if (errorMessage.includes("No routes found")) {
      console.info(
        "Jupiter Swap Quote: No routes found, retrying in 10 seconds..."
      );
    } else {
      console.error(
        `Jupiter Swap Quote: Error fetching quote, waiting 10 seconds and retrying... ${error}`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 10000));
    return fetchJupiterSwapQuote(
      whirlpool_address,
      tokenIn,
      tokenOut,
      amount_lamports,
      swap_loss_limit_pct
    );
  }
}

export async function createJupiterSwapTx(quoteResponse: any) {
  try {
    // get serialized transactions for the swap
    const swapTransaction = await (
      await fetch(`${JUP_API}/swap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey: wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
        }),
      })
    ).json();

    if (!swapTransaction || !swapTransaction.swapTransaction) {
      console.error(
        `Jupiter Swap Transaction: Failed to get swap transaction, retrying in 5 seconds...`
      );
      // console.dir(swapTransaction, { depth: null });
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return createJupiterSwapTx(quoteResponse);
    }

    // deserialize the transaction
    const swapTransactionBuf = Buffer.from(
      swapTransaction.swapTransaction,
      "base64"
    );
    let transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    // sign the transaction
    transaction.sign([wallet.payer]);
    return transaction;
  } catch (error) {
    console.log(
      `Jupiter Swap Transaction: Error creating swap transaction: ${error}`
    );
    console.log("Jupiter Swap Transaction: Retrying in 5 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return createJupiterSwapTx(quoteResponse);
  }
}
