import { FC, useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  createGenericFile,
  createNoopSigner,
  publicKey as umiPublicKey,
  generateSigner,
  transactionBuilder,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import {
  fetchCandyGuard,
  fetchCandyMachine,
  mintFromCandyMachineV2,
  mintV2,
  mplCandyMachine,
  safeFetchCandyGuard,
} from "@metaplex-foundation/mpl-candy-machine"; // Import the correct instruction
import { CandyMachine } from "@metaplex-foundation/mpl-candy-machine"; // Ensure you import your Candy Machine model if necessary
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import { toWeb3JsLegacyTransaction } from "@metaplex-foundation/umi-web3js-adapters";

export const MintNFT: FC = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [nftName, setNftName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(
    null
  );
  const [candyMachineId, setCandyMachineId] = useState("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setImageFile(event.target.files[0]);
    }
  };

  const onClick = useCallback(async () => {
    console.log("WALLET", wallet.publicKey, candyMachineId);

    if (!wallet.publicKey || !candyMachineId) {
      console.error(
        "Wallet not connected, no image uploaded, or Candy Machine ID missing!"
      );
      return;
    }

    const signer = createNoopSigner(umiPublicKey(wallet.publicKey));

    const umi = createUmi("https://api.devnet.solana.com")
      .use(irysUploader())
      .use(walletAdapterIdentity(wallet))
      .use(mplTokenMetadata())
      .use(mplCandyMachine());

    const loadedCandyMachine = await fetchCandyMachine(
      umi,
      umiPublicKey(candyMachineId)
    );

    console.log("CANDY", loadedCandyMachine);

    const nftMint = generateSigner(umi);
    const nftOwner = generateSigner(umi).publicKey;

    // Build mint transaction with fee deducted
    const mintTransaction = await transactionBuilder()
      .add(setComputeUnitLimit(umi, { units: 800_000 }))
      .add(
        mintFromCandyMachineV2(umi, {
          candyMachine: loadedCandyMachine.publicKey,
          mintAuthority: loadedCandyMachine.mintAuthority,
          nftOwner,
          nftMint,
          collectionMint: loadedCandyMachine.collectionMint,
          collectionUpdateAuthority: loadedCandyMachine.authority,
        })
      )
      .sendAndConfirm(umi);

    setTransactionStatus("NFT minting successful!");
  }, [wallet.publicKey, connection, wallet.sendTransaction]);

  return (
    <div className="my-6">
      <input
        type="text"
        className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
        placeholder="Candy Machine ID"
        onChange={(e) => setCandyMachineId(e.target.value)}
      />
      <button
        className="px-8 m-2 btn bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500"
        onClick={onClick}
      >
        <span>Mint NFT</span>
      </button>

      {transactionStatus && <p>{transactionStatus}</p>}
    </div>
  );
};
