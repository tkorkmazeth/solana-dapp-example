import { AppProps } from "next/app";
import Head from "next/head";
import { FC } from "react";
import { ContextProvider } from "../contexts/ContextProvider";
import { AppBar } from "../components/AppBar";
import { ContentContainer } from "../components/ContentContainer";
import { Footer } from "../components/Footer";
import Notifications from "../components/Notification";
import { useRouter } from "next/router"; // Import useRouter

require("@solana/wallet-adapter-react-ui/styles.css");
require("../styles/globals.css");

const App: FC<AppProps> = ({ Component, pageProps }) => {
  const router = useRouter();
  
  // Check if the current route matches `/portfolio/[walletAddress]`
  const isPortfolioRoute = router.pathname.startsWith("/portfolio/[walletAddress]");

  return (
    <>
      <Head>
        <title>Solana Scaffold All In One</title>
      </Head>

      <ContextProvider>
        <div className="flex flex-col h-screen">
          <Notifications />
          <AppBar />
          <ContentContainer>
            <Component {...pageProps} />
            {!isPortfolioRoute && <Footer />} 
          </ContentContainer>
        </div>
      </ContextProvider>
    </>
  );
};

export default App;
