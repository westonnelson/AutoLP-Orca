import { PublicKey } from "@solana/web3.js";

interface TokenInfo {
  mint: string;
  decimals: number;
  name: string;
  ratio: number;
  amount: number;
}

export interface PositionData {
  whirlpoolAddress: string;
  whirlpoolPrice: number;
  whirlpoolLiquidity: number;
  position: {
    index: number;
    address: PublicKey;
  };
  lower: {
    index: number;
    price: number;
  };
  upper: {
    index: number;
    price: number;
  };
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  fees?: {
    feeOwedA: number;
    feeOwedB: number;
  };
  rewards?: Record<number, { token: string; amount: number }>;
}

export interface WhirlpoolData {
  whirlpoolAddress: string;
  whirlpoolPrice: number;
  lower: {
    price: number;
  };
  upper: {
    price: number;
  };
}
