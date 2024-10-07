import { Connection, Keypair } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import {
  WhirlpoolContext,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  buildWhirlpoolClient,
  WhirlpoolClient,
} from "@orca-so/whirlpools-sdk";
import { ACCOUNTS } from "../config/default.js";

if (!ACCOUNTS.RPC) {
  console.error(
    "make sure you have properly set up your .env file with an RPC url"
  );
  process.exit(1);
}

export const connection: Connection = new Connection(ACCOUNTS.RPC!);
export const wallet: Wallet = new Wallet(
  Keypair.fromSecretKey(new Uint8Array(JSON.parse(ACCOUNTS.WALLET)))
);
// TODO, support for a seperate fee wallet
// export const fee_wallet: Wallet = new Wallet(
//   Keypair.fromSecretKey(new Uint8Array(JSON.parse(ACCOUNTS.FEE_WALLET)))
// );
export const provider: AnchorProvider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
export async function getCtx(): Promise<WhirlpoolContext> {
  while (true) {
    try {
      return WhirlpoolContext.withProvider(
        provider,
        ORCA_WHIRLPOOL_PROGRAM_ID
        // undefined,
        // undefined,
        // { userDefaultConfirmCommitment: "confirmed" }
      );
    } catch (error) {
      console.log(`getCtx Error: Retrying in 5 seconds... ${error}`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}
export async function getClient(): Promise<WhirlpoolClient> {
  while (true) {
    try {
      return buildWhirlpoolClient(await getCtx());
    } catch (error) {
      console.log(`getClient Error: Retrying in 5 seconds... ${error}`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}
