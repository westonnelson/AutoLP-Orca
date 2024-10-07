// This script converts a base58 encoded secret key to a wallet_solana.json file.
// Then, take the array of numbers in the wallet_solana.json file and put them in your .env file under the SECRET_KEY variable.
// You can export your secret key from Phantom wallet, for example.

import bs58 from "bs58";
import fs from "fs";
import readline from "readline";

const wallet_json = "wallet_base58.json";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("secretKey(base58):", (secret_base58: string) => {
  rl.close();
  const secret_bytes = Uint8Array.from(bs58.decode(secret_base58.trim()));

  // write file
  fs.writeFileSync(wallet_json, `[${secret_bytes.toString()}]`);
  // verify file
  const secret_bytes_loaded = JSON.parse(fs.readFileSync(wallet_json, "utf8"));
  const secret_base58_loaded = bs58.encode(
    Uint8Array.from(secret_bytes_loaded)
  );
  if (secret_base58 === secret_base58_loaded) {
    console.log(`${wallet_json} created successfully!`);
  }
});
