import { FC, useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  createGenericFile,
  createNoopSigner,
  publicKey as umiPublicKey,
  signerIdentity,
  Transaction,
  generateSigner,
  percentAmount,
  transactionBuilder,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import {
  DataV2,
  CreateMetadataAccountV3InstructionArgs,
  createFungible,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";

import {
  createTokenIfMissing,
  findAssociatedTokenPda,
  getSplAssociatedTokenProgramId,
  mintTokensTo,
  mplToolbox,
} from "@metaplex-foundation/mpl-toolbox";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";

export const CreateToken: FC = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { sendTransaction } = useWallet();
  const [tokenName, setTokenName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [amount, setAmount] = useState("");
  const [decimals, setDecimals] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(
    null
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setImageFile(event.target.files[0]);
    }
  };

  const onClick = useCallback(async () => {
    if (!wallet.publicKey || !imageFile) {
      console.error("Wallet not connected or no image uploaded!");
      return;
    }

    const signer = createNoopSigner(umiPublicKey(wallet.publicKey));

    const umi = createUmi("https://api.devnet.solana.com")
      .use(irysUploader())
      .use(walletAdapterIdentity(wallet))
      .use(mplTokenMetadata())
      .use(mplToolbox());

    const reader = new FileReader();
    reader.onloadend = async () => {
      const umiImageFile = createGenericFile(
        reader.result as string,
        imageFile.name,
        {
          tags: [{ name: "Content-Type", value: imageFile.type }],
        }
      );

      const uploadPrice = await umi.uploader.getUploadPrice([umiImageFile]);

      const imageUri = await umi.uploader
        .upload([umiImageFile])
        .catch((err) => {
          console.error("Error uploading image:", err);
          throw new Error(err);
        });

      const metadata: DataV2 = {
        name: tokenName,
        symbol: symbol,
        uri: imageUri[0],
        sellerFeeBasisPoints: 0, // Adjust seller fee basis points as needed
        creators: null,
        collection: null,
        uses: null,
      };

      console.log(
        "Uploading image to Arweave via Irys",
        "uploadPrice =>",
        Number(uploadPrice.basisPoints) / LAMPORTS_PER_SOL,
        uploadPrice.identifier
      );

      console.log("Uploading metadata to Arweave via Irys");
      const metadataUri = await umi.uploader
        .uploadJson(metadata)
        .catch((err) => {
          console.error("Error uploading metadata:", err);
          throw new Error(err);
        });

      const mintSigner = generateSigner(umi);

      // Create the create fungible instruction
      const createFungibleIx = createFungible(umi, {
        mint: mintSigner,
        name: tokenName,
        symbol: symbol,
        uri: metadataUri,
        sellerFeeBasisPoints: percentAmount(0),
        decimals: Number(decimals),
      });

      // Create the associated token account instruction
      const createTokenIx = createTokenIfMissing(umi, {
        mint: mintSigner.publicKey,
        owner: umi.identity.publicKey,
        ataProgram: getSplAssociatedTokenProgramId(umi),
      });

      // Mint tokens to the associated token account
      const mintTokensIx = mintTokensTo(umi, {
        mint: mintSigner.publicKey,
        token: findAssociatedTokenPda(umi, {
          mint: mintSigner.publicKey,
          owner: umi.identity.publicKey,
        }),
        amount: BigInt(amount),
      });

      const tx = await createFungibleIx
        .add(createTokenIx)
        .add(mintTokensIx)
        .sendAndConfirm(umi);

      setTransactionStatus("Transaction successful!");
    };

    reader.readAsArrayBuffer(imageFile);
  }, [
    wallet.publicKey,
    connection,
    wallet.sendTransaction,
    tokenName,
    symbol,
    amount,
    decimals,
    imageFile,
  ]);

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
        type="file"
        className="form-control block mb-2 w-full"
        onChange={handleFileChange}
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
        onClick={onClick}
      >
        <span>Create Token</span>
      </button>

      {transactionStatus && <p>{transactionStatus}</p>}
    </div>
  );
};
