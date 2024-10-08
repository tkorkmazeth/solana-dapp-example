import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  MintLayout,
  createApproveInstruction,
  createRevokeInstruction,
} from "@solana/spl-token";
import { SystemProgram } from "@solana/web3.js";
import { sleep } from "utils";
import { getAtaForMint } from "utils/candyMachineUtils";
import { sendTransactions } from "utils/rpcMethods";

export const CANDY_MACHINE_PROGRAM = new anchor.web3.PublicKey(
  "CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR"
);

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new anchor.web3.PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export interface CandyMachine {
  id: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  program: anchor.Program;
  state: CandyMachineState;
}

interface CandyMachineState {
  itemsAvailable: number;
  itemsRedeemed: number;
  itemsRemaining: number;
  treasury: anchor.web3.PublicKey;
  tokenMint: anchor.web3.PublicKey;
  isSoldOut: boolean;
  isActive: boolean;
  goLiveDate: anchor.BN;
  price: anchor.BN;
  gatekeeper: null | {
    expireOnUse: boolean;
    gatekeeperNetwork: anchor.web3.PublicKey;
  };
  endSettings: null | [number, anchor.BN];
  whitelistMintSettings: null | {
    mode: any;
    mint: anchor.web3.PublicKey;
    presale: boolean;
    discountPrice: null | anchor.BN;
  };
  hiddenSettings: null | {
    name: string;
    uri: string;
    hash: Uint8Array;
  };
}

interface AnchorSignatureConfirmationTransaction {
  txid: anchor.web3.TransactionSignature;
  timeout: number;
  connection: anchor.web3.Connection;
  commitment: anchor.web3.Commitment;
  queryStatus: boolean;
}

export interface Wallet {
  signTransaction(
    tx: anchor.web3.Transaction
  ): Promise<anchor.web3.Transaction>;
  signAllTransactions(
    txs: anchor.web3.Transaction[]
  ): Promise<anchor.web3.Transaction[]>;
  publicKey: anchor.web3.PublicKey;
}

export const awaitTransactionSignatureConfirmation = async ({
  txid,
  timeout,
  connection,
  commitment = "recent",
  queryStatus = false,
}: AnchorSignatureConfirmationTransaction): Promise<anchor.web3.SignatureStatus | null | void> => {
  let done = false;
  let status: anchor.web3.SignatureStatus | null | void = {
    slot: 0,
    confirmations: 0,
    err: null,
  };
  let subId = 0;
  status = await new Promise(async (resolve, reject) => {
    setTimeout(() => {
      if (done) {
        return;
      }
      done = true;
      console.log("Rejecting for timeout...");
      reject({ timeout: true });
    }, timeout);
    try {
      subId = connection.onSignature(
        txid,
        (result: any, context: any) => {
          done = true;
          status = {
            err: result.err,
            slot: context.slot,
            confirmations: 0,
          };
          if (result.err) {
            console.log("Rejected via websocket", result.err);
            reject(status);
          } else {
            console.log("Resolved via websocket", result);
            resolve(status);
          }
        },
        commitment
      );
    } catch (e) {
      done = true;
      console.error("WS error in setup", txid, e);
    }
    while (!done && queryStatus) {
      // eslint-disable-next-line no-loop-func
      (async () => {
        try {
          const signatureStatuses = await connection.getSignatureStatuses([
            txid,
          ]);
          status = signatureStatuses && signatureStatuses.value[0];
          if (!done) {
            if (!status) {
              console.log("REST null result for", txid, status);
            } else if (status.err) {
              console.log("REST error for", txid, status);
              done = true;
              reject(status.err);
            } else if (!status.confirmations) {
              console.log("REST no confirmations for", txid, status);
            } else {
              console.log("REST confirmation for", txid, status);
              done = true;
              resolve(status);
            }
          }
        } catch (e) {
          if (!done) {
            console.log("REST connection error: txid", txid, e);
          }
        }
      })();
      await sleep(2000);
    }
  });

  //@ts-ignore
  if (connection._signatureSubscriptions[subId]) {
    connection.removeSignatureListener(subId);
  }
  done = true;
  console.log("Returning status", status);
  return status;
};

export const getCandyMachineState = async (
  anchorWallet: Wallet,
  candyMachineId: anchor.web3.PublicKey,
  connection: anchor.web3.Connection
): Promise<CandyMachineState> => {
  //@ts-ignore
  const provider = new anchor.AnchorProvider(connection, anchorWallet);

  const idl = await anchor.Program.fetchIdl(CANDY_MACHINE_PROGRAM, provider);

  console.log("PROVİDERRR", idl);
  const program = new Program(JSON.parse(JSON.stringify(idl)), {
    connection,
  });

  const candyMachine = {
    id: candyMachineId,
    connection,
    program,
  };

  //@ts-ignore
  const state: any = await program.account.candyMachine.fetch(candyMachineId);
  console.log("state", state);

  const itemsAvailable = state.data.itemsAvailable.toNumber();
  const itemsRedeemed = state.itemsRedeemed.toNumber();
  const price = state.data.price.toNumber();
  const itemsRemaining = itemsAvailable - itemsRedeemed;

  let goLiveDate = state.data.goLiveDate.toNumber();
  goLiveDate = new Date(goLiveDate * 1000);

  return {
    //@ts-ignore
    candyMachine,
    itemsAvailable,
    itemsRedeemed,
    itemsRemaining,
    goLiveDate,
    price,
  };
};

const getMasterEdition = async (
  mint: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )
  )[0];
};

const getMetadata = async (
  mint: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )
  )[0];
};

const getTokenWallet = async (
  wallet: anchor.web3.PublicKey,
  mint: anchor.web3.PublicKey
) => {
  return await getAssociatedTokenAddress(mint, wallet);
};

export const mintOneToken = async (
  candyMachine: CandyMachine,
  payer: anchor.web3.PublicKey,
  mint: anchor.web3.Keypair
  //@ts-ignore
): Promise<(string | undefined)[]> => {
  console.log(mint.publicKey);
  const userTokenAccountAddress = (
    await getAtaForMint(mint.publicKey, payer)
  )[0];

  const userPayingAccountAddress = candyMachine.state.tokenMint
    ? (await getAtaForMint(candyMachine.state.tokenMint, payer))[0]
    : payer;

  const candyMachineAddress = candyMachine.id;
  const remainingAccounts = [];
  const signers: anchor.web3.Keypair[] = [mint];
  const cleanupInstructions = [];
  const token = await getTokenWallet(payer, mint.publicKey);

  const metadataAddress = await getMetadata(mint.publicKey);
  const masterEdition = await getMasterEdition(mint.publicKey);
  const [candyMachineCreator, creatorBump] = await getCandyMachineCreator(
    candyMachineAddress
  );
  const instructions = [
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint.publicKey,
      space: MintLayout.span,
      lamports:
        await candyMachine.program.provider.connection.getMinimumBalanceForRentExemption(
          MintLayout.span
        ),
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(mint.publicKey, 0, payer, payer),
    createAssociatedTokenAccountInstruction(
      token,
      payer,
      payer,
      mint.publicKey
    ),
    createMintToInstruction(mint.publicKey, token, payer, 1),
  ];

  if (candyMachine.state.whitelistMintSettings) {
    const mint = new anchor.web3.PublicKey(
      candyMachine.state.whitelistMintSettings.mint
    );

    const whitelistToken = (await getAtaForMint(mint, payer))[0];
    remainingAccounts.push({
      pubkey: whitelistToken,
      isWritable: true,
      isSigner: false,
    });

    if (candyMachine.state.whitelistMintSettings.mode.burnEveryTime) {
      const whitelistBurnAuthority = anchor.web3.Keypair.generate();

      signers.push(whitelistBurnAuthority);
      remainingAccounts.push({
        pubkey: mint,
        isWritable: true,
        isSigner: false,
      });
      instructions.push(
        createApproveInstruction(
          whitelistToken,
          whitelistBurnAuthority.publicKey,
          payer,
          1
        )
      );
      cleanupInstructions.push(createRevokeInstruction(whitelistToken, payer));
    }
  }

  instructions.push(
    createApproveInstruction(
      userPayingAccountAddress, // Account to set the delegate for
      candyMachineAddress, // Delegate account authorized to transfer tokens
      payer, // Owner of the account
      candyMachine.state.price.toNumber(), // Amount to approve (max tokens delegate can transfer)
      [], // No multiSigners (if the owner is not a multisig)
      TOKEN_PROGRAM_ID // SPL Token program ID
    )
  );

  cleanupInstructions.push(
    createRevokeInstruction(userPayingAccountAddress, payer)
  );

  await sendTransactions(
    candyMachine.program.provider.connection,
    //@ts-ignore
    candyMachine.program.provider.wallet,
    [instructions, cleanupInstructions],
    [signers, []]
  );
};

const getCandyMachineCreator = async (
  candyMachine: anchor.web3.PublicKey
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("candy_machine"), candyMachine.toBuffer()],
    CANDY_MACHINE_PROGRAM
  );
};
