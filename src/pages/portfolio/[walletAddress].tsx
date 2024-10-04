import { TokenDetails, TokenMetrics, TokensList } from "components/helius";
import NFTDetails from "components/helius/nfts/NFTDetails";
import NFTList from "components/helius/nfts/NFTList";
import NFTMetrics from "components/helius/nfts/NFTMetrics";
import { FungibleToken, NonFungibleToken } from "models";
import React, { Suspense } from "react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const PortfolioPage = () => {
  const router = useRouter();
  const { walletAddress } = router.query; // Get walletAddress from URL
  const [fungibleTokens, setFungibleTokens] = useState<FungibleToken[]>([]);
  const [nonFungibleTokens, setNonFungibleTokens] = useState<
    NonFungibleToken[]
  >([]);
  const [searchParams, setSearchParams] = useState(router.query);

  useEffect(() => {
    if (walletAddress) {
      // Fetch assets only when walletAddress is available
      getAllAssets(walletAddress as string)
        .then(({ fungibleTokens, nonFungibleTokens }) => {
          setFungibleTokens(fungibleTokens);
          setNonFungibleTokens(nonFungibleTokens);
        })
        .catch((error) => {
          console.error("Error fetching assets:", error);
        });
    }
  }, [walletAddress]);

  useEffect(() => {
    const params = {
      view: Array.isArray(router.query.view)
        ? router.query.view[0]
        : router.query.view || "",
      details: Array.isArray(router.query.details)
        ? router.query.details[0]
        : router.query.details || "",
    };

    setSearchParams(params);
  }, [router.query]);

  if (!walletAddress) {
    return <div>Loading...</div>;
  }

  return (
    <div className="h-screen bg-radial-gradient">
      <div className="lg:pl-20">
        <main>
          <div className="px-6 py-6">
            {/* Tokens */}
            <div>
              {searchParams.tokenDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-700 bg-opacity-70">
                  <div className="h-4/5 w-10/12 sm:w-2/3">
                    <TokenDetails
                      tokenData={fungibleTokens.filter(
                        (item) => item.id === searchParams.details
                      )}
                      //@ts-ignore
                      searchParams={searchParams}
                      walletAddress={walletAddress as string}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* NFTs */}
            <div>
              {searchParams.details && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-700 bg-opacity-70">
                  <div className="h-4/5 w-10/12 sm:w-2/3">
                    <NFTDetails
                      nftData={nonFungibleTokens.filter(
                        (item) => item.id === searchParams.details
                      )}
                      searchParams={"view=" + searchParams.view}
                      walletAddress={walletAddress as string}
                    />
                  </div>
                </div>
              )}
            </div>

            <div
              className={`${
                searchParams.details
                  ? "flex h-screen flex-col overflow-hidden"
                  : ""
              }${
                searchParams.tokenDetails
                  ? "flex h-screen flex-col overflow-hidden"
                  : ""
              }`}
            >
              <Suspense
                fallback={<div>Loading...</div>}
                key={walletAddress as string}
              >
                <div>
                  {searchParams.view === "tokens" && (
                    <>
                      <TokenMetrics fungibleTokens={fungibleTokens} />
                      <TokensList
                        tokens={fungibleTokens}
                        searchParams={searchParams.toString()}
                        walletAddress={walletAddress as string}
                      />
                    </>
                  )}
                  {searchParams.view === "nfts" && (
                    <>
                      <NFTMetrics nonFungibleTokens={nonFungibleTokens} />
                      <NFTList
                        tokens={nonFungibleTokens}
                        searchParams={searchParams.toString()}
                        walletAddress={walletAddress as string}
                      />
                    </>
                  )}
                </div>
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const getAllAssets = async (walletAddress: string) => {
  const url = process.env.NEXT_PUBLIC_HELIUS_RPC_URL;

  if (!url) {
    throw new Error("NEXT_PUBLIC_HELIUS_RPC_URL is not set");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "my-id",
      method: "searchAssets",
      params: {
        ownerAddress: walletAddress,
        tokenType: "all",
        displayOptions: {
          showNativeBalance: true,
          showInscription: true,
          showCollectionMetadata: true,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data`);
  }

  const data = await response.json();
  const items: (FungibleToken | NonFungibleToken)[] = data.result.items;

  let fungibleTokens: FungibleToken[] = items.filter(
    (item): item is FungibleToken =>
      item.interface === "FungibleToken" || item.interface === "FungibleAsset"
  );

  // Hardcode token images for known assets
  fungibleTokens = fungibleTokens.map((item) => {
    if (item.id === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") {
      return {
        ...item,
        content: {
          ...item.content,
          files: [
            {
              uri: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
              cdn_uri: "",
              mime: "image/png",
            },
          ],
          links: {
            image:
              "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
          },
        },
      };
    }
    return item;
  });

  const nonFungibleTokens: NonFungibleToken[] = items.filter(
    (item): item is NonFungibleToken =>
      !["FungibleToken", "FungibleAsset"].includes(item.interface)
  );

  const solBalance = data.result.nativeBalance.lamports;

  const solToken = {
    interface: "FungibleAsset",
    id: "So11111111111111111111111111111111111111112", // Mint address as ID
    content: {
      $schema: "https://schema.metaplex.com/nft1.0.json",
      json_uri: "",
      files: [
        {
          uri: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
          cdn_uri: "", // Assuming this is correct
          mime: "image/png",
        },
      ],
      metadata: {
        description: "Solana Token",
        name: "Wrapped SOL",
        symbol: "SOL",
        token_standard: "Native Token",
      },
      links: {
        image:
          "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      },
    },
    authorities: [], // Assuming empty for SOL
    compression: {
      eligible: false,
      compressed: false,
      data_hash: "",
      creator_hash: "",
      asset_hash: "",
      tree: "",
      seq: 0,
      leaf_id: 0,
    },
    grouping: [], // Assuming empty for SOL
    royalty: {
      royalty_model: "", // Fill as needed
      target: null,
      percent: 0,
      basis_points: 0,
      primary_sale_happened: false,
      locked: false,
    },
    creators: [], // Assuming empty for SOL
    ownership: {
      frozen: false,
      delegated: false,
      delegate: null,
      ownership_model: "token",
      owner: nonFungibleTokens[0]?.ownership.owner,
    },
    supply: null, // Assuming null for SOL
    mutable: true, // Assuming true for SOL
    burnt: false, // Assuming false for SOL

    token_info: {
      symbol: "SOL",
      balance: solBalance,
      supply: 0, // Assuming null for SOL
      decimals: 9,
      token_program: "", // Fill as needed
      associated_token_address: "", // Fill as needed
      price_info: {
        price_per_token: data.result.nativeBalance.price_per_sol, // Fill with actual price if available
        total_price: data.result.nativeBalance.total_price, // Fill with actual total price if available
        currency: "", // Fill as needed
      },
    },
  };

  if (solBalance > 0) {
    fungibleTokens.push(solToken);
  }

  return { fungibleTokens, nonFungibleTokens };
};

export default PortfolioPage;
