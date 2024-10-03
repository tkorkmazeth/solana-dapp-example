import React, { useCallback, useEffect, useMemo, useState } from "react";
import Countdown from "react-countdown";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { useAlert } from "react-alert";

import * as anchor from "@coral-xyz/anchor";
import { Loader, SelectAndConnectWalletButton } from "components";
import useUserSOLBalanceStore from "stores/useUserSOLBalanceStore";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  CandyGuard,
  CandyMachine,
  DefaultGuardSetMintArgs,
  fetchCandyGuard,
  fetchCandyMachine,
  mintV2,
  mplCandyMachine,
} from "@metaplex-foundation/mpl-candy-machine";
import { fromTxError } from "utils/errors";
import {
  generateSigner,
  publicKey,
  some,
  transactionBuilder,
  unwrapOption,
} from "@metaplex-foundation/umi";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import {
  mplToolbox,
  setComputeUnitLimit,
} from "@metaplex-foundation/mpl-toolbox";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";

export interface MintSectionProps {
  config: anchor.web3.PublicKey;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeOut: number;
  candyMachineId: anchor.web3.PublicKey;
}

const umi = createUmi("https://api.devnet.solana.com")
  .use(mplCandyMachine())
  .use(mplToolbox())
  .use(mplTokenMetadata());

export const MintSection = (props: MintSectionProps) => {
  const { connection } = useConnection();
  const [candyMachine, setCandyMachine] = useState<CandyMachine | null>(null);
  const [candyGuard, setCandyGuard] = useState<CandyGuard | null>(null);
  const [candyMachineId, setCandyMachineId] = useState<string>(
    "Assx8wu754rHmsFvWspyLguVfdDqQ2s5wrvwiaNoWFWs"
  );
  const wallet = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isSoldOut, setIsSoldOut] = useState(false);

  const fetchCandyMachineData = useCallback(async () => {
    if (!candyMachineId) throw new Error("Candy Machine ID is required.");

    const candyMachinePublicKey = publicKey(candyMachineId);
    const candyMachineData = await fetchCandyMachine(
      umi,
      candyMachinePublicKey
    );
    const candyGuardData = await fetchCandyGuard(
      umi,
      candyMachineData.mintAuthority
    );

    setCandyMachine(candyMachineData);
    setCandyGuard(candyGuardData);

    // Set sold out status
    setIsSoldOut(Number(candyMachineData.data.itemsAvailable) === 0);
  }, [candyMachineId]);

  // Fetch candy machine on mount
  useEffect(() => {
    fetchCandyMachineData();
  }, [fetchCandyMachineData]);

  const solPaymentGuard = useMemo(() => {
    return candyGuard ? unwrapOption(candyGuard.guards.solPayment) : null;
  }, [candyGuard]);

  const cost = useMemo(() => {
    return candyGuard
      ? solPaymentGuard
        ? `${Number(solPaymentGuard.lamports.basisPoints) / 1e9} SOL`
        : "Free mint"
      : "...";
  }, [candyGuard]);

  const mint = async () => {
    if (!candyMachine || !candyGuard)
      throw new Error("Missing Candy Machine or Guard");

    setIsLoading(true);
    const { guards } = candyGuard;

    let mintArgs: Partial<DefaultGuardSetMintArgs> = {};
    const enabledGuardsKeys =
      guards && Object.keys(guards).filter((key) => guards[key]);

    if (enabledGuardsKeys.length) {
      enabledGuardsKeys.forEach((key) => {
        const guardObject = unwrapOption(candyGuard.guards[key]);
        if (guardObject) mintArgs[key] = some(guardObject);
      });
    }

    const umiWalletAdapter = umi.use(walletAdapterIdentity(wallet));
    const nftMint = generateSigner(umiWalletAdapter);

    try {
      await transactionBuilder()
        .add(setComputeUnitLimit(umiWalletAdapter, { units: 800_000 }))
        .add(
          mintV2(umiWalletAdapter, {
            candyMachine: candyMachine.publicKey,
            nftMint,
            collectionMint: candyMachine.collectionMint,
            collectionUpdateAuthority: candyMachine.authority,
            tokenStandard: candyMachine.tokenStandard,
            candyGuard: candyGuard?.publicKey,
            mintArgs,
          })
        )
        .sendAndConfirm(umiWalletAdapter);

      setFormMessage("Minted successfully!");
    } catch (e: any) {
      const msg = fromTxError(e);
      setFormMessage(msg ? msg.message : e.message || e.toString());
    } finally {
      setIsLoading(false);
      setTimeout(() => setFormMessage(null), 5000);
    }
  };

  return (
    <main className="p-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          {wallet && (
            <p className="text-lg">
              Balance: ◎
              {(
                useUserSOLBalanceStore.getState().balance || 0
              ).toLocaleString()}
            </p>
          )}

          {candyMachine && (
            <p>
              {Number(candyMachine.data.itemsAvailable) > 0
                ? `${Number(candyMachine.items.length)} of ${Number(
                    candyMachine.items.length
                  )} Available`
                : "Sold Out"}
            </p>
          )}
        </div>

        <div>
          {!wallet ? (
            <SelectAndConnectWalletButton onUseWalletClick={() => {}} />
          ) : (
            <button
              disabled={isSoldOut || isLoading || !isActive}
              onClick={mint}
              className="btn btn-primary btn-wide btn-lg"
            >
              {isSoldOut ? (
                "SOLD OUT"
              ) : isActive ? (
                isLoading ? (
                  <Loader noText={true} />
                ) : (
                  `MINT for ${cost}`
                )
              ) : (
                <Countdown
                  date={props.startDate}
                  onMount={({ completed }) => completed && setIsActive(true)}
                  onComplete={() => setIsActive(true)}
                  renderer={renderCounter}
                />
              )}
            </button>
          )}
        </div>
      </div>

      {formMessage && <p className="mt-4 text-red-500">{formMessage}</p>}
    </main>
  );
};

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  if (completed) return <span>Minting starts now!</span>;
  return (
    <span>
      {days > 0 && `${days} days, `}
      {hours} hours, {minutes} minutes, {seconds} seconds
    </span>
  );
};
