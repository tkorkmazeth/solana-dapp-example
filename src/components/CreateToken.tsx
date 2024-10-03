import { FC, useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";
import {
  CreateMetadataAccountV3InstructionData,
  createMetadataAccountV3,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";

import { publicKey as umiPublicKey } from "@metaplex-foundation/umi";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { toWeb3JsLegacyTransaction } from "@metaplex-foundation/umi-web3js-adapters";
import useConnectionStore from "stores/useConnectionStore";

const umi = createUmi("https://api.devnet.solana.com")
  .use(mplToolbox())
  .use(mplTokenMetadata());

export const CreateToken: FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { recentBlockhash } = useConnectionStore();
  const wallet = useWallet();
  const [tokenName, setTokenName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [metadata, setMetadata] = useState("");
  const [amount, setAmount] = useState("");
  const [decimals, setDecimals] = useState("");

  const onClick = useCallback(
    async (form) => {
      const lamports = await getMinimumBalanceForRentExemptMint(connection);
      const mintKeypair = Keypair.generate();
      const tokenATA = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        publicKey
      );
      const umiWalletAdapter = umi.use(walletAdapterIdentity(wallet));

      const createMetadataInstruction = createMetadataAccountV3(umi, {
        mint: umiPublicKey(mintKeypair.publicKey),
        mintAuthority: umiWalletAdapter.identity,
        payer: umiWalletAdapter.identity,
        updateAuthority: umiWalletAdapter.identity,
        data: {
          name: form.tokenName,
          symbol: form.symbol,
          uri: form.metadata,
          creators: null,
          sellerFeeBasisPoints: 0,
          uses: null,
          collection: null,
        },
        isMutable: false,
        collectionDetails: null,
      })
        .setBlockhash(recentBlockhash)
        .build(umi);

      const web3JsTransaction = toWeb3JsLegacyTransaction(
        createMetadataInstruction
      );

      const createNewTokenTransaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports: lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          form.decimals,
          publicKey,
          publicKey,
          TOKEN_PROGRAM_ID
        ),
        createAssociatedTokenAccountInstruction(
          publicKey,
          tokenATA,
          publicKey,
          mintKeypair.publicKey
        ),
        createMintToInstruction(
          mintKeypair.publicKey,
          tokenATA,
          publicKey,
          form.amount * Math.pow(10, form.decimals)
        ),
        web3JsTransaction
      );

      createNewTokenTransaction.feePayer = publicKey;
      await sendTransaction(createNewTokenTransaction, connection, {
        signers: [mintKeypair],
      });
    },
    [publicKey, connection, sendTransaction]
  );

  return (
    <div className="my-6">
      <input
        type="text"
        className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
        placeholder="Token Name"
        onChange={(e) => setTokenName(e.target.value)}
      />
      <input
        type="text"
        className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
        placeholder="Symbol"
        onChange={(e) => setSymbol(e.target.value)}
      />
      <input
        type="text"
        className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
        placeholder="Metadata Url"
        onChange={(e) => setMetadata(e.target.value)}
      />
      <input
        type="number"
        className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
        placeholder="Amount"
        onChange={(e) => setAmount(e.target.value)}
      />
      <input
        type="number"
        className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
        placeholder="Decimals"
        onChange={(e) => setDecimals(e.target.value)}
      />

      <button
        className="px-8 m-2 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 ..."
        onClick={() =>
          onClick({
            decimals: Number(decimals),
            amount: Number(amount),
            metadata: metadata,
            symbol: symbol,
            tokenName: tokenName,
          })
        }
      >
        <span>Create Token</span>
      </button>
    </div>
  );
};
