import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Instruction } from "@orca-so/common-sdk";
import {
  PDAUtil,
  PriceMath,
  IGNORE_CACHE,
  PositionBundleUtil,
  WhirlpoolIx,
  buildDefaultAccountFetcher,
  TickArrayUtil,
  TickUtil,
} from "@orca-so/whirlpools-sdk";
import { Decimal } from "decimal.js";

// TODO: complete ability to set a custom mid range price (if current pool price differs from market price)

// local functions
import { getCtx, getClient } from "./index.js";
import { ACCOUNTS, POOL_SETTINGS } from "../config/index.js";
import { appendJsonFile, updateJsonFile } from "../utils/index.js";

export async function openPositionBundle(
  whirlpool_address: string
  // start_price?: number
): Promise<Instruction[]> {
  try {
    const poolSettings = POOL_SETTINGS[whirlpool_address];
    const ctx = await getCtx();
    const client = await getClient();
    // Get the Whirlpool
    const whirlpool_pubkey = new PublicKey(whirlpool_address);
    const whirlpool = await client.getPool(whirlpool_pubkey);
    // Define the position bundle address
    if (!ACCOUNTS.POSITION_BUNDLE.ADDRESS) {
      console.error(
        "Position bundle address is undefined. Make sure you have properly set up your env file"
      );
      process.exit(1);
    }
    const position_bundle_pubkey = new PublicKey(
      ACCOUNTS.POSITION_BUNDLE.ADDRESS
    );

    // TODO: Set a custom mid price
    // let price;
    // if (start_price) {
    //   price = start_price;
    // } else {
    // set mid price to current pool price
    const sqrtPrice = await whirlpool.getData().sqrtPrice;
    let price = PriceMath.sqrtPriceX64ToPrice(
      sqrtPrice,
      whirlpool.getTokenAInfo().decimals,
      whirlpool.getTokenBInfo().decimals
    );
    // console.dir(`price: ${price}`, { depth: null });
    // if (start_price) {
    //   price = new Decimal(start_price);
    // }
    // console.dir(`new price: ${price}`, { depth: null });
    // }
    // Set price range
    const lower_price = new Decimal(
      new Decimal(price)
        .times(
          new Decimal(1).minus(new Decimal(poolSettings.rangePct).dividedBy(2))
        )
        .toNumber()
    );
    // console.dir(`lower_price: ${lower_price}`, { depth: null });
    const upper_price = new Decimal(
      new Decimal(price)
        .times(
          new Decimal(1).plus(new Decimal(poolSettings.rangePct).dividedBy(2))
        )
        .toNumber()
    );
    // console.dir(`upper_price: ${upper_price}`, { depth: null });

    // Adjust price range (not all prices can be set, only a limited number of prices are available for range specification)
    // (prices corresponding to InitializableTickIndex are available)
    const whirlpool_data = whirlpool.getData();
    const token_a = whirlpool.getTokenAInfo();
    const token_b = whirlpool.getTokenBInfo();
    const lower_tick_index = PriceMath.priceToInitializableTickIndex(
      lower_price,
      token_a.decimals,
      token_b.decimals,
      whirlpool_data.tickSpacing
    );
    const upper_tick_index = PriceMath.priceToInitializableTickIndex(
      upper_price,
      token_a.decimals,
      token_b.decimals,
      whirlpool_data.tickSpacing
    );

    // TODO: Check if any ticks are uninitialized
    // const tickArrayPdas = TickArrayUtil.getTickArrayPDAs(
    //   lower_tick_index,
    //   whirlpool_data.tickSpacing,
    //   Math.ceil(
    //     (upper_tick_index - lower_tick_index) / whirlpool_data.tickSpacing
    //   ),
    //   ctx.program.programId,
    //   whirlpool_pubkey,
    //   true // assuming aToB is true
    // );
    // const tickArrays = await Promise.all(
    //   tickArrayPdas.map((pda) => ctx.fetcher.getTickArray(pda.publicKey))
    // );
    // const uninitialized_tick_array =
    //   TickArrayUtil.getUninitializedArrays(tickArrays);
    // const init_ticks = uninitialized_tick_array.length > 0 ? true : false;
    // // create instructions to initialize tick arrays if needed
    // let init_tick_array_ixs: Instruction[] = [];
    // if (init_ticks) {
    //   console.log(
    //     "Open Position: Some tick arrays need to be initialized:",
    //     uninitialized_tick_array
    //   );
    //   const tickArrayPDAsToInit = uninitialized_tick_array.map(
    //     (tickArray) => tickArrayPdas[tickArray]
    //   );
    //   // create instruction to initialize tick arrays
    //   init_tick_array_ixs = tickArrayPDAsToInit.map((pda, index) =>
    //     WhirlpoolIx.initTickArrayIx(ctx.program, {
    //       funder: ctx.wallet.publicKey,
    //       startTick: TickUtil.getStartTickIndex(
    //         uninitialized_tick_array[index],
    //         whirlpool_data.tickSpacing
    //       ),
    //       tickArrayPda: pda,
    //       whirlpool: whirlpool_pubkey,
    //     })
    //   );
    // }

    // Get PositionBundle account
    const position_bundle = await ctx.fetcher.getPositionBundle(
      position_bundle_pubkey,
      IGNORE_CACHE
    );
    if (!position_bundle) {
      throw new Error("Open Position: Position bundle not found!");
    }
    // Get ATA for PositionBundle
    const position_bundle_token_account = getAssociatedTokenAddressSync(
      position_bundle.positionBundleMint,
      ctx.wallet.publicKey
    );
    // Get unused bundle indexes in PositionBundle
    const unoccupied_bundle_indexes =
      PositionBundleUtil.getUnoccupiedBundleIndexes(position_bundle);

    // Generate address for positions managed by PositionBundle
    const bundled_position_pda = PDAUtil.getBundledPosition(
      ctx.program.programId,
      position_bundle.positionBundleMint,
      unoccupied_bundle_indexes[0]
    );

    // Create an instruction to open the first position managed by PositionBundle
    const open_bundled_position_ix = WhirlpoolIx.openBundledPositionIx(
      ctx.program,
      {
        funder: ctx.wallet.publicKey,
        positionBundle: position_bundle_pubkey,
        positionBundleAuthority: ctx.wallet.publicKey,
        positionBundleTokenAccount: position_bundle_token_account,
        bundleIndex: unoccupied_bundle_indexes[0],
        bundledPositionPda: bundled_position_pda,
        whirlpool: whirlpool_pubkey,
        tickLowerIndex: lower_tick_index,
        tickUpperIndex: upper_tick_index,
      }
    );

    // record time opened and more to positions.json
    updateJsonFile(
      bundled_position_pda.publicKey.toBase58(),
      {
        name: poolSettings.name,
        whirlpool_address: whirlpool_pubkey.toBase58(),
        time_opened: new Date().toISOString(),
        time_harvested: null,
        time_closed: null,
      },
      "positions"
    );

    // record time opened to history.json
    appendJsonFile(
      poolSettings.name,
      {
        range: poolSettings.rangePct * 100,
        time_opened: new Date().toISOString(),
      },
      "history"
    );

    return [open_bundled_position_ix];
  } catch (error) {
    console.log(error);
    console.log("Retrying in 5 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return openPositionBundle(whirlpool_address);
  }
}
