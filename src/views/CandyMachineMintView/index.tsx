import Link from "next/link";
import { FC, useEffect } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import * as anchor from "@coral-xyz/anchor";

import { SolanaLogo } from "components";
import { MintSection } from "./MintSection";
import { config } from "./config";
import styles from "./index.module.css";
import useUserSOLBalanceStore from "stores/useUserSOLBalanceStore";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import useConnectionStore from "stores/useConnectionStore";

const treasury = new anchor.web3.PublicKey(config.TREASURY_ADDRESS!);

const candyMachineConfig = new anchor.web3.PublicKey(
  config.CANDY_MACHINE_CONFIG!
);

const candyMachineId = new anchor.web3.PublicKey(config.CANDY_MACHINE_ID!);

const startDateSeed = parseInt(process.env.REACT_APP_CANDY_START_DATE!, 10);

const txTimeout = 30000;

export const CandyMachineMintView: FC = ({}) => {
  const wallet = useWallet();
  const { connection } = useConnection();

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
    <div className="container mx-auto max-w-6xl p-8 2xl:px-0">
      <div className={styles.container}>
        <div className="navbar mb-2 shadow-lg bg-neutral text-neutral-content rounded-box">
          <div className="flex-none">
            <button className="btn btn-square btn-ghost">
              <span className="text-4xl">🍬</span>
            </button>
          </div>
          <div className="flex-1 px-2 mx-2">
            <div className="text-sm breadcrumbs">
              <ul className="text-xl">
                <li>
                  <Link href="/">Templates</Link>
                </li>
                <li>
                  <span className="opacity-40">NFT Mint UI</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex-none">
            <WalletMultiButton className="btn btn-ghost" />
          </div>
        </div>

        <div className="text-center pt-2">
          <div className="hero ">
            <div className="text-center hero-content">
              <div className="max-w-lg">
                <h1 className="mb-5 text-5xl">
                  Candy Machine Mint UI <SolanaLogo />
                </h1>

                {/* <p className="mb-5">
                  Here is very basic example of minting site. <br />
                  It uses{" "}
                  <a
                    href="https://github.com/exiled-apes/candy-machine-mint"
                    target="_blank"
                    className="link font-bold"
                    rel="noreferrer"
                  >
                    exiled-apes/candy-machine-mint
                  </a>{" "}
                  code migrated to be used with Next.JS app.
                </p> */}

                {/* <p>UI connects to DEVNET network.</p> */}
              </div>
            </div>
          </div>

          <div>
            <MintSection
              candyMachineId={candyMachineId}
              config={candyMachineConfig}
              startDate={startDateSeed}
              treasury={treasury}
              txTimeOut={txTimeout}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
