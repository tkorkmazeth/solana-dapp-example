import { FungibleToken } from "models";
import React from "react";
import { TokenTable } from "..";

interface TokensProps {
  searchParams: string;
  walletAddress: string;
  tokens: FungibleToken[];
}

const TokensList = ({ searchParams, walletAddress, tokens }: TokensProps) => {
  if (!tokens) {
    return <div>Loading...</div>;
  }
  return (
    <div className="rounded-lg bg-black bg-opacity-50 ">
      <div className="p-3 sm:p-5">
        <TokenTable
          tokens={tokens}
          source="tokenPage"
          walletAddress={walletAddress}
          perPage={8}
        />
      </div>
    </div>
  );
};

export default TokensList;
