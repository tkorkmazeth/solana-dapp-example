import type { NextPage } from "next";
import Head from "next/head";
import { transitions, positions, Provider as AlertProvider } from "react-alert";
import AlertTemplate from "react-alert-template-basic";
import { CandyMachineMintView } from "views/CandyMachineMintView";

// optional configuration
const options = {
  position: positions.BOTTOM_LEFT,
  timeout: 5000,
  offset: "10px",

  transition: transitions.SCALE,
};

const Mint: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Mint NFT!</title>
        <meta name="description" content="This site will fly high 🦤" />
      </Head>
      <AlertProvider template={AlertTemplate} {...options}>
        <CandyMachineMintView />
      </AlertProvider>
    </div>
  );
};

export default Mint;
