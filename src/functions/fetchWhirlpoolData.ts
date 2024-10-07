import { PublicKey } from "@solana/web3.js";
import { DecimalUtil } from "@orca-so/common-sdk";
import {
  PDAUtil,
  IGNORE_CACHE,
  PoolUtil,
  PriceMath,
  PositionBundleUtil,
  TokenExtensionUtil,
  collectFeesQuote,
  collectRewardsQuote,
  TickArrayUtil,
} from "@orca-so/whirlpools-sdk";
import { Decimal } from "decimal.js";
import { getCtx, getClient } from "./index.js";
import { ACCOUNTS, TOKENS_BY_MINT, TOKENS_BY_NAME } from "../config/index.js";
import { PositionData } from "../types/global.d.js";

export async function fetchWhirlpoolsDataBundle(
  fetch_fee_data?: boolean,
  whirlpool_filter_address?: string
): Promise<PositionData[] | number> {
  try {
    const ctx = await getCtx();
    const client = await getClient();
    // Retrieve the position bundle address
    const position_bundle_address = ACCOUNTS.POSITION_BUNDLE.ADDRESS;
    if (!position_bundle_address) {
      console.error(
        "Position bundle address is undefined. Make sure you have properly set up your env file"
      );
      process.exit(1);
    }
    const position_bundle_pubkey = new PublicKey(position_bundle_address);
    // Get PositionBundle account
    const position_bundle = await ctx.fetcher.getPositionBundle(
      position_bundle_pubkey,
      IGNORE_CACHE
    );
    if (!position_bundle) {
      console.log("position bundle not found!");
      console.dir(position_bundle, { depth: null });
      return 1;
    }

    // Get used bundle indexes in PositionBundle
    const occupied_bundle_indexes =
      PositionBundleUtil.getOccupiedBundleIndexes(position_bundle);
    // console.log(occupied_bundle_indexes);
    if (occupied_bundle_indexes.length === 0) {
      return 2; // No occupied bundle indexes found
    }
    // Fetch data for each position in the bundle
    let position_status = [];
    for (let i = 0; i < occupied_bundle_indexes.length; i++) {
      const bundle_index = occupied_bundle_indexes[i];
      const bundled_position_pda = PDAUtil.getBundledPosition(
        ctx.program.programId,
        position_bundle.positionBundleMint,
        bundle_index
      );
      // debug code to skip a faulty position
      // const address_to_skip = "abc...";
      // if (
      //   bundled_position_pda.publicKey.toBase58() === address_to_skip
      // ) {
      //   continue;
      // }
      const position = await client.getPosition(bundled_position_pda.publicKey);
      const data = position.getData();

      // TODO: unfinished code to fetch transaction data for a position from the chain
      // const confirmedSignatures = (
      //   await ctx.connection.getSignaturesForAddress(
      //     bundled_position_pda.publicKey,
      //     {
      //       limit: 10,
      //     }
      //   )
      // ).map((signatureInfo) => signatureInfo.signature);
      // const transactions = await ctx.connection.getParsedTransactions(
      //   confirmedSignatures
      // );
      // console.dir(transactions, { depth: null });

      // Get the pool to which the position belongs
      const pool = await client.getPool(data.whirlpool);
      const token_a = pool.getTokenAInfo();
      const token_b = pool.getTokenBInfo();

      const price = PriceMath.sqrtPriceX64ToPrice(
        pool.getData().sqrtPrice,
        token_a.decimals,
        token_b.decimals
      );

      const total_liquidity = new Decimal(pool.getData().liquidity.toString())
        .dividedBy(
          new Decimal(10).pow(TOKENS_BY_MINT[token_b.mint.toBase58()].decimals)
        )
        .toNumber();
      // Get the price range of the position
      const lower_price = PriceMath.tickIndexToPrice(
        data.tickLowerIndex,
        token_a.decimals,
        token_b.decimals
      );
      const upper_price = PriceMath.tickIndexToPrice(
        data.tickUpperIndex,
        token_a.decimals,
        token_b.decimals
      );

      // // calculate ratio from clamped current sqrt price
      // const lower_sqrt_price = Math.sqrt(
      //   PriceMath.tickIndexToPrice(
      //     data.tickLowerIndex,
      //     token_a.decimals,
      //     token_b.decimals
      //   ).toNumber()
      // );
      // const upper_sqrt_price = Math.sqrt(
      //   PriceMath.tickIndexToPrice(
      //     data.tickUpperIndex,
      //     token_a.decimals,
      //     token_b.decimals
      //   ).toNumber()
      // );
      // const clamped_current_sqrt_price = Math.min(
      //   Math.max(lower_sqrt_price, Math.sqrt(price.toNumber())),
      //   upper_sqrt_price
      // );

      // const deposit_a = 1 / clamped_current_sqrt_price - 1 / upper_sqrt_price;
      // const deposit_b = clamped_current_sqrt_price - lower_sqrt_price;
      // const deposit_a_value_in_b = deposit_a * price.toNumber();
      // const deposit_b_value_in_b = deposit_b;
      // const total_value_in_b = deposit_a_value_in_b + deposit_b_value_in_b;
      // const desired_ratio_a = deposit_a_value_in_b / total_value_in_b;
      // const desired_ratio_b = deposit_b_value_in_b / total_value_in_b;

      // Calculate the ratios from the current price
      const priceNum = price.toNumber();
      const lowerPriceNum = lower_price.toNumber();
      const upperPriceNum = upper_price.toNumber();
      const ratio_token_b =
        priceNum >= upperPriceNum
          ? 1
          : priceNum <= lowerPriceNum
          ? 0
          : (priceNum - lowerPriceNum) / (upperPriceNum - lowerPriceNum);
      const ratio_token_a =
        priceNum <= lowerPriceNum
          ? 1
          : priceNum >= upperPriceNum
          ? 0
          : (upperPriceNum - priceNum) / (upperPriceNum - lowerPriceNum);

      // Calculate the amount of tokens that can be withdrawn from the position
      const amounts = PoolUtil.getTokenAmountsFromLiquidity(
        data.liquidity,
        pool.getData().sqrtPrice,
        PriceMath.tickIndexToSqrtPriceX64(data.tickLowerIndex),
        PriceMath.tickIndexToSqrtPriceX64(data.tickUpperIndex),
        true
      );

      // accrued fees data
      let fees_data: any = {};
      if (fetch_fee_data) {
        // Get TickArray and Tick
        const tick_spacing = pool.getData().tickSpacing;
        const tick_array_lower_pubkey = PDAUtil.getTickArrayFromTickIndex(
          position.getData().tickLowerIndex,
          tick_spacing,
          pool.getAddress(),
          ctx.program.programId
        ).publicKey;
        const tick_array_upper_pubkey = PDAUtil.getTickArrayFromTickIndex(
          position.getData().tickUpperIndex,
          tick_spacing,
          pool.getAddress(),
          ctx.program.programId
        ).publicKey;
        const tick_array_lower = await ctx.fetcher.getTickArray(
          tick_array_lower_pubkey
        );
        const tick_array_upper = await ctx.fetcher.getTickArray(
          tick_array_upper_pubkey
        );
        const tick_lower = TickArrayUtil.getTickFromArray(
          tick_array_lower!,
          position.getData().tickLowerIndex,
          tick_spacing
        );
        const tick_upper = TickArrayUtil.getTickFromArray(
          tick_array_upper!,
          position.getData().tickUpperIndex,
          tick_spacing
        );

        // Get token info for TokenExtensions
        const tokenExtensionCtx =
          await TokenExtensionUtil.buildTokenExtensionContext(
            ctx.fetcher,
            pool.getData()
          );

        // Get trade fees
        const quote_fee = await collectFeesQuote({
          whirlpool: pool.getData(),
          position: position.getData(),
          tickLower: tick_lower,
          tickUpper: tick_upper,
          tokenExtensionCtx,
        });

        // Get rewards
        const quote_reward = await collectRewardsQuote({
          whirlpool: pool.getData(),
          position: position.getData(),
          tickLower: tick_lower,
          tickUpper: tick_upper,
          tokenExtensionCtx,
        });

        const fees: any = {
          feeOwedA: DecimalUtil.adjustDecimals(
            new Decimal(quote_fee.feeOwedA.toString()),
            TOKENS_BY_MINT[token_a.mint.toBase58()].decimals
          ).toNumber(),
          feeOwedB: DecimalUtil.adjustDecimals(
            new Decimal(quote_fee.feeOwedB.toString()),
            TOKENS_BY_MINT[token_b.mint.toBase58()].decimals
          ).toNumber(),
        };

        const rewards: any = {};
        quote_reward.rewardOwed.map((reward, i) => {
          const reward_info = pool.getData().rewardInfos[i];

          if (PoolUtil.isRewardInitialized(reward_info)) {
            const token = TOKENS_BY_MINT[reward_info.mint.toBase58()];
            const reward_amount = DecimalUtil.adjustDecimals(
              new Decimal(reward.toString()),
              token?.decimals
            ).toNumber();
            rewards[i] = {
              token: TOKENS_BY_NAME[token?.name]?.mint.toBase58(),
              amount: reward_amount,
            };
          } else {
            rewards[i] = {
              token: token_a.mint.toBase58(),
              amount: 0,
            };
          }
        });

        fees_data = {
          fees,
          rewards,
        };
      }
      const position_data = {
        whirlpoolAddress: data.whirlpool.toBase58(),
        whirlpoolPrice: Number(price.toFixed(token_b.decimals)),
        whirlpoolLiquidity: Math.round(total_liquidity),
        position: { index: bundle_index, address: position.getAddress() },
        lower: {
          index: data.tickLowerIndex,
          price: Number(lower_price.toFixed(token_b.decimals)),
        },
        upper: {
          index: data.tickUpperIndex,
          price: Number(upper_price.toFixed(token_b.decimals)),
        },
        tokenA: {
          mint: token_a.mint.toBase58(),
          decimals: token_a.decimals,
          name: TOKENS_BY_MINT[token_a.mint.toBase58()].name,
          ratio: ratio_token_a,
          amount: DecimalUtil.fromBN(
            amounts.tokenA,
            token_a.decimals
          ).toNumber(),
        },
        tokenB: {
          mint: token_b.mint.toBase58(),
          decimals: token_b.decimals,
          name: TOKENS_BY_MINT[token_b.mint.toBase58()].name,
          ratio: ratio_token_b,
          amount: DecimalUtil.fromBN(
            amounts.tokenB,
            token_b.decimals
          ).toNumber(),
        },
        fees: fees_data.fees,
        rewards: fees_data.rewards,
      };
      if (!whirlpool_filter_address) {
        position_status.push(position_data);
      } else if (
        whirlpool_filter_address &&
        position_data.whirlpoolAddress === whirlpool_filter_address
      ) {
        position_status.push(position_data);
      }
    }
    return position_status;
  } catch (error) {
    console.error("Error in fetch all whirlpools data with bundle:", error);
    console.log("Retrying in 5 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return fetchWhirlpoolsDataBundle(fetch_fee_data, whirlpool_filter_address);
  }
}
