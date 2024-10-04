import { FC, useEffect } from "react";

import { UpdateMetadata } from "components/UpdateMetadata";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import useUserSOLBalanceStore from "stores/useUserSOLBalanceStore";
import useConnectionStore from "stores/useConnectionStore";

export const UpdateView: FC = ({}) => {
  const wallet = useWallet();
  const { connection } = useConnection();

  const balance = useUserSOLBalanceStore((s) => s.balance);
  const { getUserSOLBalance } = useUserSOLBalanceStore();
  const { getRecentBlockhash } = useConnectionStore();

  useEffect(() => {
    if (wallet.publicKey) {
      console.log(wallet.publicKey.toBase58());
      getUserSOLBalance(wallet.publicKey, connection);
      getRecentBlockhash(connection);
    }
  }, [wallet.publicKey, connection, getUserSOLBalance]);

  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-tr from-[#9945FF] to-[#14F195]">
          Update Metadata
        </h1>
        <div className="text-center">
          <UpdateMetadata />
        </div>
      </div>
    </div>
  );
};
