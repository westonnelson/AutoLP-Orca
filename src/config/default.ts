import dotenv from "dotenv";
dotenv.config();

// make sure to set up these env variables in your .env file prior to running AutoLP
export const ACCOUNTS = {
  WALLET: process.env.WALLET,
  POSITION_BUNDLE: {
    ADDRESS: process.env.POSITION_BUNDLE_ADDRESS,
    MINT: process.env.POSITION_BUNDLE_MINT,
    TOKEN_ACCOUNT: process.env.POSITION_BUNDLE_TOKEN_ACCOUNT,
  },
  RPC: process.env.RPC,
  // These Jito accounts are all public and current as of Oct 2024
  JITO_TIP_ACCOUNTS: [
    "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
    "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
    "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
    "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
    "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
    "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
    "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
    "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  ],
  JITO_URLS: {
    NY: "https://ny.mainnet.block-engine.jito.wtf",
    AMSTERDAM: "https://amsterdam.mainnet.block-engine.jito.wtf",
  },
  JUPITER_API: "https://quote-api.jup.ag/v6", // public juptier API
};
export const CONFIG = {
  JITO_URL: ACCOUNTS.JITO_URLS.NY, // JITO RPC URL to use for transactions
  JITO_TIP: 50000, // default backup tip if WebSocket fails
  RERUN: true, // whether to rerun the program automatically
  RERUN_MINUTES: 10, // how often to rerun the script in minutes after last run completes
  SOL_RESERVE: 0.25, // minimum SOL reserve to keep in wallet to avoid running out of SOL
  MIN_DEPOSIT_AMOUNT: 10, // minimum amount of both tokens to swap and deposit in USD
};
