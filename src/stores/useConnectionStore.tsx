import create, { State } from "zustand";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

interface ConnectionStore extends State {
  recentBlockhash: string;
  getRecentBlockhash: (connection: Connection) => void;
}

const useConnectionStore = create<ConnectionStore>((set, _get) => ({
  recentBlockhash: "",
  getRecentBlockhash: async (connection) => {
    let blockhash = "";
    try {
      const { blockhash: recentBlockhash } =
        await connection.getLatestBlockhash("confirmed");
      blockhash = recentBlockhash;
    } catch (e) {
      console.log(`error getting recent blockhash: `, e);
    }
    set((s) => {
      s.recentBlockhash = blockhash;
      console.log(`recent blockhash updated: `, blockhash);
    });
  },
}));

export default useConnectionStore;
