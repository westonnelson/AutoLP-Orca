import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import {
  Instruction,
  resolveOrCreateATA,
  EMPTY_INSTRUCTION,
} from "@orca-so/common-sdk";
import {
  IGNORE_CACHE,
  PDAUtil,
  PoolUtil,
  PositionBundleUtil,
  WhirlpoolIx,
} from "@orca-so/whirlpools-sdk";
// local functions
import { ACCOUNTS } from "../config/default.js";
import { TOKENS_BY_NAME } from "../config/tokens.js";
import { getCtx, getClient } from "./index.js";
import { updateJsonFile } from "../utils/index.js";

export async function harvestFeesBundle(position_address: string) {
  try {
    while (true) {
      const ctx = await getCtx();
      const client = await getClient();
      // Get PositionBundle account
      const position_pubkey = new PublicKey(position_address);
      if (!ACCOUNTS.POSITION_BUNDLE.ADDRESS) {
        console.error(
          "Position bundle address is undefined. Make sure you have properly set up your env file"
        );
        process.exit(1);
      }
      const position_bundle = await ctx.fetcher.getPositionBundle(
        new PublicKey(ACCOUNTS.POSITION_BUNDLE.ADDRESS),
        IGNORE_CACHE
      );
      if (!position_bundle) {
        console.log(
          "Harvest Fees: Position bundle not found! Retrying in 5 seconds..."
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
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
        console.log(
          "Harvest Fees: No matching position found! Retrying in 5 seconds..."
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      const bundled_position_pda = PDAUtil.getBundledPosition(
        ctx.program.programId,
        position_bundle.positionBundleMint,
        matching_bundle_index
      );
      const bundled_position_pubkey = bundled_position_pda.publicKey;

      // Get the position and the pool to which the position belongs
      const position = await client.getPosition(bundled_position_pubkey);
      const position_owner = ctx.wallet.publicKey;
      const position_token_account = getAssociatedTokenAddressSync(
        position.getData().positionMint,
        position_owner
      );
      const whirlpool_pubkey = position.getData().whirlpool;

      const whirlpool = await client.getPool(whirlpool_pubkey);

      const token_a = whirlpool.getTokenAInfo();
      const token_b = whirlpool.getTokenBInfo();

      // Get TickArray
      const tick_spacing = whirlpool.getData().tickSpacing;
      const tick_array_lower_pubkey = PDAUtil.getTickArrayFromTickIndex(
        position.getData().tickLowerIndex,
        tick_spacing,
        whirlpool_pubkey,
        ctx.program.programId
      ).publicKey;
      const tick_array_upper_pubkey = PDAUtil.getTickArrayFromTickIndex(
        position.getData().tickUpperIndex,
        tick_spacing,
        whirlpool_pubkey,
        ctx.program.programId
      ).publicKey;

      // Create token accounts to receive fees and rewards
      // Collect mint addresses of tokens to receive
      const tokens_to_be_collected = new Set<string>();
      tokens_to_be_collected.add(token_a.mint.toBase58());
      tokens_to_be_collected.add(token_b.mint.toBase58());
      whirlpool.getData().rewardInfos.map((reward_info) => {
        if (PoolUtil.isRewardInitialized(reward_info)) {
          tokens_to_be_collected.add(reward_info.mint.toBase58());
        }
      });
      // Get addresses of token accounts and get instructions to create if it does not exist
      const required_ta_ix: Instruction[] = [];
      const token_account_map = new Map<string, PublicKey>();
      for (let mint_b58 of tokens_to_be_collected) {
        const mint = new PublicKey(mint_b58);
        // If present, ix is EMPTY_INSTRUCTION
        const { address, ...ix } = await resolveOrCreateATA(
          ctx.connection,
          ctx.wallet.publicKey,
          mint,
          () => ctx.fetcher.getAccountRentExempt()
        );
        required_ta_ix.push(ix);
        token_account_map.set(mint_b58, address);
      }

      // Build the instruction to update fees and rewards
      let update_fee_and_rewards_ix = position.getData().liquidity.isZero()
        ? EMPTY_INSTRUCTION
        : WhirlpoolIx.updateFeesAndRewardsIx(ctx.program, {
            whirlpool: position.getData().whirlpool,
            position: bundled_position_pubkey,
            tickArrayLower: tick_array_lower_pubkey,
            tickArrayUpper: tick_array_upper_pubkey,
          });

      // Build the instruction to collect fees
      let collect_fees_ix = WhirlpoolIx.collectFeesV2Ix(ctx.program, {
        position: bundled_position_pubkey,
        positionAuthority: position_owner,
        positionTokenAccount: position_token_account,
        tokenMintA: token_a.mint,
        tokenMintB: token_b.mint,
        tokenOwnerAccountA: token_account_map.get(token_a.mint.toBase58())!,
        tokenOwnerAccountB: token_account_map.get(token_b.mint.toBase58())!,
        tokenProgramA: token_a.tokenProgram,
        tokenProgramB: token_b.tokenProgram,
        tokenVaultA: whirlpool.getData().tokenVaultA,
        tokenVaultB: whirlpool.getData().tokenVaultB,
        whirlpool: whirlpool_pubkey,
      });
      // Build the instructions to collect rewards
      const collect_reward_ix = [
        EMPTY_INSTRUCTION,
        EMPTY_INSTRUCTION,
        EMPTY_INSTRUCTION,
      ];
      for (let i = 0; i < whirlpool.getData().rewardInfos.length; i++) {
        const reward_info = whirlpool.getData().rewardInfos[i];
        if (!PoolUtil.isRewardInitialized(reward_info)) continue;

        collect_reward_ix[i] = WhirlpoolIx.collectRewardV2Ix(ctx.program, {
          position: bundled_position_pubkey,
          positionAuthority: position_owner,
          positionTokenAccount: position_token_account,
          rewardIndex: i,
          rewardMint: reward_info.mint,
          rewardOwnerAccount: token_account_map.get(
            reward_info.mint.toBase58()
          )!,
          rewardTokenProgram: reward_info.mint.equals(TOKENS_BY_NAME.PYUSD.mint)
            ? TOKEN_2022_PROGRAM_ID
            : TOKEN_PROGRAM_ID,
          rewardVault: reward_info.vault,
          whirlpool: whirlpool_pubkey,
        });
      }

      // record time closed to positions.json
      updateJsonFile(
        bundled_position_pda.publicKey.toBase58(),
        {
          time_harvested: new Date().toISOString(),
        },
        "positions"
      );

      return [
        ...required_ta_ix, // spread the array entries
        update_fee_and_rewards_ix,
        collect_fees_ix,
        ...collect_reward_ix, // an array
      ];
    }
  } catch (error) {
    console.error("Harvest Fees: Error, retrying in 5 seconds...", error);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return harvestFeesBundle(position_address);
  }
}
