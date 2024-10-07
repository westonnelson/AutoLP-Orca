import { Keypair } from "@solana/web3.js";
import {
  WhirlpoolContext,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil,
  WhirlpoolIx,
} from "@orca-so/whirlpools-sdk";
import { Instruction } from "@orca-so/common-sdk";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { connection, wallet } from "./index.js";
import { AnchorProvider } from "@coral-xyz/anchor";

const provider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);

export async function createPositionBundleNFT(): Promise<Instruction> {
  // Generate the address of Mint, PDA, and ATA for PositionBundle
  const position_bundle_mint_keypair = Keypair.generate();
  const position_bundle_pda = PDAUtil.getPositionBundle(
    ORCA_WHIRLPOOL_PROGRAM_ID,
    position_bundle_mint_keypair.publicKey
  );
  const position_bundle_token_account = getAssociatedTokenAddressSync(
    position_bundle_mint_keypair.publicKey,
    ctx.wallet.publicKey
  );

  // Build the instruction to initialize PositionBundle
  const initialize_position_bundle_ix = WhirlpoolIx.initializePositionBundleIx(
    ctx.program,
    {
      funder: ctx.wallet.publicKey,
      owner: ctx.wallet.publicKey,
      positionBundleMintKeypair: position_bundle_mint_keypair,
      positionBundlePda: position_bundle_pda,
      positionBundleTokenAccount: position_bundle_token_account,
    }
  );
  return initialize_position_bundle_ix;
}
