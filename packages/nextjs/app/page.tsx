"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth/RainbowKitCustomConnectButton";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const router = useRouter();
  const [showGoldMessage, setShowGoldMessage] = useState(false);

  const { data: hasGoldSwatter } = useScaffoldReadContract({
    contractName: "GoldSwatter",
    functionName: "balanceOf",
    args: [connectedAddress],
    watch: true,
  });

  useEffect(() => {
    if (connectedAddress && hasGoldSwatter) {
      const hasGold = BigInt(hasGoldSwatter.toString()) > BigInt(0);
      setShowGoldMessage(hasGold);
    } else {
      setShowGoldMessage(false);
    }
  }, [connectedAddress, hasGoldSwatter]);

  const handlePlayAsGuest = () => {
    router.push("/game");
  };

  const getNickname = () => {
    if (connectedAddress) {
      return connectedAddress.slice(-4);
    }
    return "Guest";
  };

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <div className="flex justify-end p-4">
          <div className="px-4 py-2 rounded-full bg-primary text-primary-content">{getNickname()}</div>
        </div>
        <div className="flex flex-col items-center flex-grow pt-10">
          <h1 className="mb-4 text-4xl font-bold text-center">Smack Mouch</h1>
          <p className="mb-0 text-lg text-center">Click or Tap to SMACK all the Mouches</p>
          <p className="mb-6 text-lg text-center">Protect your croissants and earn DMON!</p>

          {/* Gold Swatter Message */}
          {showGoldMessage && (
            <div className="px-6 py-3 mb-6 text-black bg-yellow-500 rounded-lg animate-bounce">
              🎉 You have a Gold Swatter! Double the smacking power! 🎉
            </div>
          )}

          <div className="flex flex-col space-y-4">
            {!connectedAddress ? (
              <button onClick={handlePlayAsGuest} className="btn btn-primary">
                Play as Guest
              </button>
            ) : (
              <button onClick={handlePlayAsGuest} className="btn btn-primary">
                Play
              </button>
            )}
            <RainbowKitCustomConnectButton />
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
