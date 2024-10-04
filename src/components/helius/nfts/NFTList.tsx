import { NonFungibleToken } from "models";
import NFTFilters from "./NFTFilters";
import NFTTable from "./NFTTable";

interface NFTListProps {
  searchParams: string;
  walletAddress: string;
  tokens: NonFungibleToken[];
}

const NFTList = ({ searchParams, walletAddress, tokens }: NFTListProps) => {
  if (!tokens) {
    return <div>Loading...</div>;
  }
  return (
    <div className="flex flex-col rounded-lg bg-black bg-opacity-50 lg:flex-row">
      {/* NFT Filter Component */}
      <div className="mx-auto w-full p-3 lg:w-[400px]">
        <NFTFilters nftDataArray={tokens} />
      </div>

      {/* NFT Table */}
      <div className="sm:w-full">
        <div className="flex-grow py-5">
          <NFTTable nftDataArray={tokens} walletAddress={walletAddress} />
        </div>
      </div>
    </div>
  );
};

export default NFTList;
