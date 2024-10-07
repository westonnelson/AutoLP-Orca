import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  unpackAccount,
} from "@solana/spl-token";
import anchor from "@coral-xyz/anchor"; // Import the entire module
const { BN } = anchor; // Destructure the needed exports
import { DecimalUtil } from "@orca-so/common-sdk";
// program functions
import { TOKENS_BY_MINT } from "../config/index.js";
import { connection, wallet } from "../functions/index.js";

export async function getWalletBalance() {
  try {
    const keypair = wallet.payer;
    const accounts = await connection.getTokenAccountsByOwner(
      keypair.publicKey,
      {
        programId: TOKEN_PROGRAM_ID,
      },
      { commitment: "processed" }
    );
    const accounts_2022 = await connection.getTokenAccountsByOwner(
      keypair.publicKey,
      {
        programId: TOKEN_2022_PROGRAM_ID,
      },
      { commitment: "processed" }
    );
    //   console.log("getTokenAccountsByOwner:", accounts, accounts_2022);

    // get SOL balance
    const sol_balance = await connection.getBalance(keypair.publicKey, {
      commitment: "processed",
    });
    let token_balances: { [key: string]: any } = {};
    token_balances["So11111111111111111111111111111111111111112"] = {
      pubkey: keypair.publicKey.toBase58(),
      mint: "So11111111111111111111111111111111111111112",
      name: "SOL",
      amount: sol_balance,
      ui_amount: sol_balance / 10 ** 9,
    };

    // Deserialize token account data
    for (let i = 0; i < accounts.value.length; i++) {
      const value = accounts.value[i];

      // Deserialize
      const parsed_token_account = unpackAccount(value.pubkey, value.account);
      // Use the mint address to determine which token account is for which token
      const mint = parsed_token_account.mint;
      const token_def = TOKENS_BY_MINT[mint.toBase58()];
      // Ignore non-devToken accounts REMOVE?
      if (token_def === undefined) continue;

      // The balance is "amount"
      const amount = parsed_token_account.amount;
      // The balance is managed as an integer value, so it must be converted for UI display
      const ui_amount = DecimalUtil.fromBN(
        new BN(amount.toString()),
        token_def.decimals
      );

      token_balances[mint.toBase58()] = {
        pubkey: value.pubkey.toBase58(),
        mint: mint.toBase58(),
        name: token_def.name,
        amount: amount,
        ui_amount: ui_amount,
      };
    }

    // Deserialize token account data for TOKEN 2022 accounts
    for (let i = 0; i < accounts_2022.value.length; i++) {
      const value = accounts_2022.value[i];

      // Deserialize
      const parsed_token_account = unpackAccount(
        value.pubkey,
        value.account,
        TOKEN_2022_PROGRAM_ID
      );
      // Use the mint address to determine which token account is for which token
      const mint = parsed_token_account.mint;
      const token_def = TOKENS_BY_MINT[mint.toBase58()];
      // Ignore non-devToken accounts REMOVE?
      if (token_def === undefined) continue;

      // The balance is "amount"
      const amount = parsed_token_account.amount;
      // The balance is managed as an integer value, so it must be converted for UI display
      const ui_amount = DecimalUtil.fromBN(
        new BN(amount.toString()),
        token_def.decimals
      );

      token_balances[mint.toBase58()] = {
        pubkey: value.pubkey.toBase58(),
        mint: mint.toBase58(),
        name: token_def.name,
        amount: amount,
        ui_amount: ui_amount,
      };
    }
    return token_balances;
  } catch (error) {
    console.error(`Error getting token balance: ${error}`);
    console.log("Retrying in 5 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await getWalletBalance();
  }
}
