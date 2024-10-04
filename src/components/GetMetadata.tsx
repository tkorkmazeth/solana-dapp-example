import { FC, useState, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  deserializeMetadata,
  JsonMetadata,
  MPL_TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey, RpcAccount, SolAmount } from "@metaplex-foundation/umi";

export const GetMetadata: FC = () => {
  const { connection } = useConnection();
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenMetadata, setTokenMetadata] = useState(null);
  const [logo, setLogo] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const getMetadata = useCallback(
    async (form) => {
      try {
        const tokenMint = new PublicKey(form.tokenAddress);
        const [metadataPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata", "utf8"),
            new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID).toBuffer(),
            tokenMint.toBuffer(),
          ],
          new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID)
        );

        // Fetch metadata account
        const tokenMetaDataAccount = await connection.getAccountInfo(
          metadataPDA
        );

        if (!tokenMetaDataAccount) {
          console.log("Token metadata account not found");
          return;
        }

        const lamports: SolAmount = {
          basisPoints: BigInt(tokenMetaDataAccount.lamports),
          identifier: "SOL",
          decimals: 9,
        };
        const rawAccount: RpcAccount = {
          publicKey: publicKey(metadataPDA.toString()),
          data: tokenMetaDataAccount.data,
          executable: tokenMetaDataAccount.executable,
          owner: publicKey(tokenMetaDataAccount.owner),
          lamports: lamports,
          rentEpoch: BigInt(tokenMetaDataAccount.rentEpoch),
        };

        // Deserialize metadata
        const decodedMetadata = deserializeMetadata(rawAccount);
        console.log("METADATA", decodedMetadata);

        if (!decodedMetadata) {
          console.log("Failed to decode metadata");
          return;
        }

        console.log("Decoded Metadata:", decodedMetadata);

        // Fetch the URI content (which typically contains image, name, etc.)
        const uriRes = await fetch(decodedMetadata.uri);
        const uriData = (await uriRes.json()) as JsonMetadata;

        // Set metadata and logo
        setTokenMetadata(decodedMetadata);
        setLogo(uriData.image);
        setLoaded(true);
        setTokenAddress(""); // Clear the input field
      } catch (error) {
        console.error("Error fetching token metadata:", error);
      }
    },
    [connection]
  );

  return (
    <>
      <div className="my-6">
        <input
          type="text"
          value={tokenAddress}
          className="form-control block mb-2 ml-auto mr-auto max-w-800 px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
          placeholder="Token Address"
          onChange={(e) => setTokenAddress(e.target.value)}
        />
        <button
          className="px-8 m-2 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 ..."
          onClick={() => getMetadata({ tokenAddress })}
        >
          <span>Get Metadata</span>
        </button>
      </div>
      <div className="my-6">
        {!loaded ? undefined : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Token Metadata
              </h3>
            </div>
            <div className="border-t border-gray-200">
              <dl className="divide-y divide-gray-200">
                <>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">logo</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <img
                        src={logo}
                        alt="token"
                        className="w-1/4 h-full inline-block object-center object-cover lg:w-1/4 lg:h-full"
                      />
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">name</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {tokenMetadata.name}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">
                      symbol
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {tokenMetadata.symbol || "undefined"}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">uri</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <a
                        href={tokenMetadata.uri}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {tokenMetadata.uri}
                      </a>
                    </dd>
                  </div>
                </>
              </dl>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
