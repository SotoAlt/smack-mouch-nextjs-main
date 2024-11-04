"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth/RainbowKitCustomConnectButton";

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
          <div className="bg-primary text-primary-content px-4 py-2 rounded-full">{getNickname()}</div>
        </div>
        <div className="flex items-center flex-col flex-grow pt-10">
          <h1 className="text-center text-4xl font-bold mb-4">Smack Mouch</h1>
          <p className="text-center text-lg mb-6">Click or Tap to SMACK all the Mouches and protect your croissants!</p>
          
          {/* Gold Swatter Message */}
          {showGoldMessage && (
            <div className="bg-yellow-500 text-black px-6 py-3 rounded-lg mb-6 animate-bounce">
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
