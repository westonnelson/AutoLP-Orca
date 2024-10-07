import { VersionedTransaction } from "@solana/web3.js";
import { TransactionBuilder, Instruction } from "@orca-so/common-sdk";
import { connection, wallet } from "../functions/index.js";

export async function buildVersionedTransaction(
  instructions: Instruction[]
): Promise<VersionedTransaction> {
  try {
    const tx_builder = new TransactionBuilder(connection, wallet);
    instructions.forEach((instruction) => {
      tx_builder.addInstruction(instruction);
    });
    const built_tx = await tx_builder.build();
    const signed_tx = await wallet.signTransaction(
      built_tx.transaction as VersionedTransaction
    );
    signed_tx.sign(built_tx.signers);
    return signed_tx;
  } catch (error) {
    console.log(
      `Build Versioned Transaction Error: Waiting 5 seconds... ${error}`
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return buildVersionedTransaction(instructions);
  }
}
