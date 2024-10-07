import { PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  EMPTY_INSTRUCTION,
  Instruction,
  Percentage,
  resolveOrCreateATA,
} from "@orca-so/common-sdk";
import {
  PDAUtil,
  WhirlpoolIx,
  PoolUtil,
  decreaseLiquidityQuoteByLiquidityWithParams,
  TokenExtensionUtil,
  IGNORE_CACHE,
  PositionBundleUtil,
  Whirlpool,
  DecreaseLiquidityQuote,
} from "@orca-so/whirlpools-sdk";
// local functions
import { getCtx, getClient } from "./index.js";
import { ACCOUNTS, POOL_SETTINGS, TOKENS_BY_NAME } from "../config/index.js";
import { appendJsonFile, updateJsonFile } from "../utils/index.js";

export async function closePositionBundle(
  position_address: string
): Promise<Instruction[] | undefined> {
  try {
    const ctx = await getCtx();
    const client = await getClient();
    // Retrieve the position bundle address
    const position_bundle_address: string | undefined =
      ACCOUNTS.POSITION_BUNDLE.ADDRESS;
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
    const occupied_bundle_indexes: number[] =
      PositionBundleUtil.getOccupiedBundleIndexes(position_bundle);
    let matching_bundle_index: number | null = null;
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

    const bundled_position_pda = PDAUtil.getBundledPosition(
      ctx.program.programId,
      position_bundle.positionBundleMint,
      matching_bundle_index
    );
    const bundled_position_pubkey = bundled_position_pda.publicKey;

    // Set acceptable slippage
    const slippage: Percentage = Percentage.fromFraction(10, 1000); // 10 = 1%

    // Get the position and the pool to which the position belongs
    const position = await client.getPosition(bundled_position_pubkey);
    const position_owner: PublicKey = ctx.wallet.publicKey;
    const position_token_account: PublicKey = getAssociatedTokenAddressSync(
      position.getData().positionMint,
      position_owner
    );
    const whirlpool_pubkey: PublicKey = position.getData().whirlpool;

    const whirlpool: Whirlpool = await client.getPool(whirlpool_pubkey);
    const whirlpool_data = whirlpool.getData();

    const token_a = whirlpool.getTokenAInfo();
    const token_b = whirlpool.getTokenBInfo();

    // Get TickArray and Tick
    const tick_spacing: number = whirlpool.getData().tickSpacing;
    const tick_array_lower_pubkey: PublicKey =
      PDAUtil.getTickArrayFromTickIndex(
        position.getData().tickLowerIndex,
        tick_spacing,
        whirlpool_pubkey,
        ctx.program.programId
      ).publicKey;
    const tick_array_upper_pubkey: PublicKey =
      PDAUtil.getTickArrayFromTickIndex(
        position.getData().tickUpperIndex,
        tick_spacing,
        whirlpool_pubkey,
        ctx.program.programId
      ).publicKey;

    // Create token accounts to receive fees and rewards
    // Collect mint addresses of tokens to receive
    const tokens_to_be_collected: Set<string> = new Set<string>();
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
    let update_fee_and_rewards_ix: Instruction = position
      .getData()
      .liquidity.isZero()
      ? EMPTY_INSTRUCTION
      : WhirlpoolIx.updateFeesAndRewardsIx(ctx.program, {
          whirlpool: position.getData().whirlpool,
          position: bundled_position_pubkey,
          tickArrayLower: tick_array_lower_pubkey,
          tickArrayUpper: tick_array_upper_pubkey,
        });

    //   // Build the instruction to collect fees
    let collect_fees_ix: Instruction = WhirlpoolIx.collectFeesV2Ix(
      ctx.program,
      {
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
      }
    );
    // Build the instructions to collect rewards
    const collect_reward_ix: Instruction[] = [
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
        rewardOwnerAccount: token_account_map.get(reward_info.mint.toBase58())!,
        rewardTokenProgram: reward_info.mint.equals(TOKENS_BY_NAME.PYUSD.mint)
          ? TOKEN_2022_PROGRAM_ID
          : TOKEN_PROGRAM_ID,
        rewardVault: reward_info.vault,
        whirlpool: whirlpool_pubkey,
      });
    }

    // Estimate the amount of tokens that can be withdrawn from the position
    const quote: DecreaseLiquidityQuote =
      decreaseLiquidityQuoteByLiquidityWithParams({
        sqrtPrice: whirlpool_data.sqrtPrice,
        tickCurrentIndex: whirlpool_data.tickCurrentIndex,
        tickLowerIndex: position.getData().tickLowerIndex,
        tickUpperIndex: position.getData().tickUpperIndex,
        liquidity: position.getData().liquidity,
        slippageTolerance: slippage,
        tokenExtensionCtx: await TokenExtensionUtil.buildTokenExtensionContext(
          ctx.fetcher,
          whirlpool_data
        ),
      });

    // Build the instruction to decrease liquidity
    const decrease_liquidity_ix: Instruction = position
      .getData()
      .liquidity.isZero()
      ? EMPTY_INSTRUCTION
      : WhirlpoolIx.decreaseLiquidityV2Ix(ctx.program, {
          ...quote,
          position: bundled_position_pubkey,
          positionAuthority: position_owner,
          positionTokenAccount: position_token_account,
          tickArrayLower: tick_array_lower_pubkey,
          tickArrayUpper: tick_array_upper_pubkey,
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

    // Build the instruction to close the position managed by PositionBundle
    const close_bundled_position_ix: Instruction =
      WhirlpoolIx.closeBundledPositionIx(ctx.program, {
        bundledPosition: bundled_position_pubkey,
        positionBundleAuthority: ctx.wallet.publicKey,
        positionBundleTokenAccount: position_token_account,
        positionBundle: position_bundle_pubkey,
        bundleIndex: matching_bundle_index,
        receiver: ctx.wallet.publicKey,
      });

    // record time closed to positions.json
    updateJsonFile(
      bundled_position_pda.publicKey.toBase58(),
      {
        time_closed: new Date().toISOString(),
        time_harvested: new Date().toISOString(),
      },
      "positions"
    );

    // record time close to history.json
    appendJsonFile(
      POOL_SETTINGS[whirlpool_pubkey.toBase58()].name,
      {
        time_closed: new Date().toISOString(),
      },
      "history"
    );

    return [
      ...required_ta_ix,
      update_fee_and_rewards_ix,
      collect_fees_ix,
      ...collect_reward_ix,
      decrease_liquidity_ix,
      close_bundled_position_ix,
    ];
  } catch (error) {
    console.log(error);
    return closePositionBundle(position_address);
  }
}
