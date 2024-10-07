import { PublicKey } from "@solana/web3.js";
import {
  PDAUtil,
  WhirlpoolIx,
  IGNORE_CACHE,
  PositionBundleUtil,
} from "@orca-so/whirlpools-sdk";
// local functions
import { getCtx } from "./index.js";
import { ACCOUNTS } from "../config/index.js";
import { Instruction } from "@orca-so/common-sdk";

export async function closePositionNoHarvest(
  position_address: string
): Promise<Instruction[] | undefined> {
  try {
    const ctx = await getCtx();
    // Retrieve the position bundle address
    const position_bundle_address = ACCOUNTS.POSITION_BUNDLE.ADDRESS;
    if (!position_bundle_address) {
      console.error(
        "Position bundle address is undefined. Make sure you have properly set up your env file"
      );
      process.exit(1);
    }
    const position_bundle_pubkey = new PublicKey(position_bundle_address);
    const position_pubkey = new PublicKey(position_address);
    // Get PositionBundle account
    const position_bundle = await ctx.fetcher.getPositionBundle(
      position_bundle_pubkey,
      IGNORE_CACHE
    );
    if (!position_bundle) {
      console.log("position bundle not found!");
      return;
    }
    // Get used bundle indexes in PositionBundle
    const occupied_bundle_indexes =
      PositionBundleUtil.getOccupiedBundleIndexes(position_bundle);
    let matching_bundle_index = null;
    for (let i = 0; i < occupied_bundle_indexes.length; i++) {
      const bundle_index = occupied_bundle_indexes[i];
      const bundled_position_pda = PDAUtil.getBundledPosition(
        ctx.program.programId,
        position_bundle.positionBundleMint,
        bundle_index
      );
      if (bundled_position_pda.publicKey.equals(position_pubkey)) {
        matching_bundle_index = bundle_index;
        break;
      }
    }
    if (matching_bundle_index === null) {
      console.log("No matching position found!");
      return;
    }
    if (!ACCOUNTS.POSITION_BUNDLE.TOKEN_ACCOUNT) {
      console.error(
        "Position bundle token account is undefined. Make sure you have properly set up your env file"
      );
      process.exit(1);
    }
    const position_token_account = new PublicKey(
      ACCOUNTS.POSITION_BUNDLE.TOKEN_ACCOUNT
    );

    // Build the instruction to close the position managed by PositionBundle
    const close_bundled_position_ix = WhirlpoolIx.closeBundledPositionIx(
      ctx.program,
      {
        bundledPosition: position_pubkey,
        positionBundleAuthority: ctx.wallet.publicKey,
        positionBundleTokenAccount: position_token_account,
        positionBundle: position_bundle_pubkey,
        bundleIndex: matching_bundle_index,
        receiver: ctx.wallet.publicKey,
      }
    );

    return [close_bundled_position_ix];
  } catch (error) {
    console.log(error);
    return closePositionNoHarvest(position_address);
  }
}
