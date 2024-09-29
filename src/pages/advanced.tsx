import type { NextPage } from "next";
import Head from "next/head";
import { HomeView } from "../views";
import { AdvancedView } from "views/advanced";

const Home: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Solana Scaffold Advanced</title>
        <meta name="description" content="Solana Scaffold" />
      </Head>
      <AdvancedView />
    </div>
  );
};

export default Home;
