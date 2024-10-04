import { FC, useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, PublicKey } from "@solana/web3.js";
import {
  DataV2,
  updateMetadataAccountV2,
  MPL_TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey as umiPublicKey } from "@metaplex-foundation/umi";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import useConnectionStore from "stores/useConnectionStore";
import { toWeb3JsLegacyTransaction } from "@metaplex-foundation/umi-web3js-adapters";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";

export const UpdateMetadata: FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const wallet = useWallet();
  const [tokenMint, setTokenMint] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [metadata, setMetadata] = useState("");

  const { recentBlockhash } = useConnectionStore();

  const umi = createUmi("https://api.devnet.solana.com")
    .use(mplToolbox())
    .use(walletAdapterIdentity(wallet));

  const onClick = useCallback(
    async (form) => {
      if (!publicKey) {
        console.log("Wallet not connected");
        return;
      }

      const mint = new PublicKey(form.tokenMint);
      const [metadataPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID).toBuffer(),
          mint.toBuffer(),
        ],
        new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID)
      );

      const tokenMetaDataAccount = await connection.getAccountInfo(metadataPDA);

      if (!tokenMetaDataAccount) {
        console.log("Token metadata account not found");
        return;
      }

      const tokenMetadata = {
        name: form.tokenName,
        symbol: form.symbol,
        uri: form.metadata,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
      } as DataV2;

      const instruction = updateMetadataAccountV2(umi, {
        metadata: umiPublicKey(metadataPDA),
        updateAuthority: umi.identity,
        data: tokenMetadata,
      })
        .setBlockhash(recentBlockhash)
        .build(umi);

      const web3JsTransaction = toWeb3JsLegacyTransaction(instruction);

      const updateMetadataTransaction = new Transaction().add(
        web3JsTransaction
      );

      updateMetadataTransaction.feePayer = publicKey;

      const simulationResult = await connection.simulateTransaction(
        updateMetadataTransaction
      );
      console.log("Simulation Result:", simulationResult);

      try {
        const signature = await sendTransaction(
          updateMetadataTransaction,
          connection
        );
        console.log("Transaction signature:", signature);
      } catch (error) {
        console.error("Failed to send transaction:", error);
      }
    },
    [publicKey, connection, sendTransaction, recentBlockhash]
  );

  return (
    <div className="my-6">
      <input
        type="text"
        className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
        placeholder="Token Mint Address"
        onChange={(e) => setTokenMint(e.target.value)}
      />
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
      <button
        className="px-8 m-2 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 ..."
        onClick={() =>
          onClick({
            metadata: metadata,
            symbol: symbol,
            tokenName: tokenName,
            tokenMint: tokenMint,
          })
        }
      >
        <span>Update Metadata</span>
      </button>
    </div>
  );
};
