import {
  SystemProgram,
  PublicKey,
  Connection,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";
import bs58 from "bs58";
// local functions
import { ACCOUNTS, CONFIG } from "../config/index.js";
import { connection, wallet } from "./connections.js";

// constants
const { JITO_TIP_ACCOUNTS } = ACCOUNTS;
const { JITO_URL } = CONFIG;

async function checkBlockhashExpiration(
  blockhash: any,
  connection: Connection
): Promise<boolean> {
  try {
    const latestBlockHeight = await connection.getBlockHeight();
    if (latestBlockHeight > blockhash.lastValidBlockHeight - 150) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(
      `Check Blockhash Status: Error, retrying in 5 seconds...`,
      error
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return checkBlockhashExpiration(blockhash, connection);
  }
}

async function createTiptx(wallet: Wallet, JITO_TIP: number): Promise<string> {
  try {
    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    const tipInstruction = SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: new PublicKey(
        JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)]
      ),
      lamports: JITO_TIP,
    });

    let transaction = new VersionedTransaction(
      new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [tipInstruction],
      }).compileToV0Message()
    );
    transaction.sign([wallet.payer]);
    return bs58.encode(transaction.serialize());
  } catch (error) {
    console.log(
      `Send Jito Transaction: Error creating tip transaction, retrying in 5 seconds...`,
      error
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return createTiptx(wallet, JITO_TIP);
  }
}

async function sendJitoBundle(
  serializedTransactions: string[]
): Promise<Response> {
  try {
    return await fetch(JITO_URL + "/api/v1/bundles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sendBundle",
        params: [serializedTransactions],
      }),
    }).then((res) => res.json());
  } catch (error) {
    console.log(`Send Jito Bundle: Error, retrying in 5 seconds...`, error);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return sendJitoBundle(serializedTransactions);
  }
}

async function checkStatus(
  latestBlockhash: any,
  response: any
): Promise<number | boolean> {
  try {
    const blockhashExpired = await checkBlockhashExpiration(
      latestBlockhash,
      connection
    );

    if (blockhashExpired) {
      console.log(`Check Jito Status: Blockhash expired, retrying...`);
      return 1; // return 1 if blockhash expired
    }

    const status = await fetch(JITO_URL + "/api/v1/bundles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getInflightBundleStatuses",
        params: [[response.result]],
      }),
    }).then((res) => res.json());
    // console.dir(status, { depth: null });
    if (
      status?.result?.value?.[0]?.status === "Pending" ||
      !status?.result?.value?.[0]
    ) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return checkStatus(latestBlockhash, response);
    } else if (status.result.value[0].status === "Failed") {
      console.log(`Check Jito Status: Transaction Failed! Retrying...`);
      return 1; // return 1 if transaction failed
    } else if (status.result.value[0].status === "Landed") {
      console.log(
        `Check Jito Status: Transaction ${status.result.value[0].status}! Link: https://explorer.jito.wtf/bundle/${response.result}`
      );
      return true;
    } else {
      throw new Error("Check Jito Status: Unknown error");
    }
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage.includes("Check Jito Status: Unknown error")) {
    } else {
      console.error(
        `Check Jito Status: Error, retrying in 5 seconds...`,
        error
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return checkStatus(latestBlockhash, response);
  }
}

// take in a list of serialized txs, add a tip instruction tx, and send it to Jito. wait for result, return true or false.
export async function sendJitoTransaction(
  transactions: VersionedTransaction[],
  JITO_TIP: number = 50000
): Promise<number | boolean> {
  try {
    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    // create tip transaction
    const tipTx = await createTiptx(wallet, JITO_TIP);
    // send the bundle to Jito
    const response = await sendJitoBundle([
      ...transactions.map((tx) => bs58.encode(tx.serialize())),
      tipTx,
    ]);
    // check Jito response
    if (!response) {
      console.error(
        `Send Jito Transaction: Failed, retring in 5 seconds...`,
        response
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return sendJitoTransaction(transactions, JITO_TIP);
    }
    // checking status of Jito Bundle
    console.log(`Send Jito Transaction: Sent bundle, watching status...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const status = await checkStatus(latestBlockhash, response);
    return status;
  } catch (error) {
    console.log(
      `Send Jito Transaction Error: Sending transaction, retrying in 5 seconds...`,
      error
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return sendJitoTransaction(transactions, JITO_TIP);
  }
}
