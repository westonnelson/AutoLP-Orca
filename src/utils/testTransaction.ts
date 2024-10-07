import { Instruction } from "@orca-so/common-sdk";
import { getCtx } from "../functions/index.js";
import { buildVersionedTransaction } from "./buildVersionedTransaction.js";
import { VersionedTransaction } from "@solana/web3.js";

// preflight check instructions as a transaction
export async function testInstructions(ixs: Instruction[]): Promise<boolean> {
  try {
    const tx = await buildVersionedTransaction(ixs);
    const ctx = await getCtx();
    console.log(`Performing Preflight Check...`);
    const { value: preflightResult } = await ctx.connection.simulateTransaction(
      tx,
      {
        commitment: "confirmed",
        sigVerify: true,
      }
    );
    console.dir(preflightResult, { depth: null });
    if (preflightResult.err) {
      console.error("Preflight Check Failed:", preflightResult.err);
      return false;
    }

    console.log("Preflight Check Passed");
    return true;
  } catch (error: any) {
    const errorMessage = error.message || error.toString();
    console.error("Error during preflight check:", errorMessage);
    return false;
  }
}

// preflight check a transaction
export async function testVersionedTransaction(
  tx: VersionedTransaction
): Promise<boolean> {
  try {
    const ctx = await getCtx();
    console.log(`Performing Preflight Check...`);
    const { value: preflightResult } = await ctx.connection.simulateTransaction(
      tx,
      {
        commitment: "confirmed",
        sigVerify: true,
      }
    );
    console.dir(preflightResult, { depth: null });
    if (preflightResult.err) {
      console.error("Preflight Check Failed:", preflightResult.err);
      return false;
    }

    console.log("Preflight Check Passed");
    return true;
  } catch (error: any) {
    const errorMessage = error.message || error.toString();
    console.error("Error during preflight check:", errorMessage);
    return false;
  }
}
