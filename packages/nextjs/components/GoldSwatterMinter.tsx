import React from 'react';
import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import Image from 'next/image';

const GoldSwatterMinter: React.FC = () => {
  const [tokenId, setTokenId] = useState<string>("");

  const { writeContractAsync: writeGoldSwatterAsync, isMining } = useScaffoldWriteContract("GoldSwatter");

  const handleMint = async () => {
    try {
      const result = await writeGoldSwatterAsync({
        functionName: "mint",
      });
      console.log("Minting result:", result);
      
      // You might want to update this part to extract the tokenId from the result
      // For now, we'll just set a placeholder value
      setTokenId("Minted successfully");
    } catch (error) {
      console.error("Error minting NFT:", error);
    }
  };

  return (
    <div className="text-center">
      <div className="relative inline-block group">
        <button 
          onClick={handleMint} 
          disabled={isMining}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-full shadow-lg transform transition duration-200 ease-in-out hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMining ? "Minting..." : "Get a Gold Swatter!"}
        </button>
        <div className="absolute z-10 w-48 p-2 mt-2 text-sm text-white bg-black rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center mb-2">
            <Image src="/gold-swatter.png" alt="Gold Swatter" width={30} height={30} className="mr-2" />
            <span className="font-bold">Gold Swatter</span>
          </div>
          <p>0.001 ETH</p>
          <p>Kills 2 flies on one hit!</p>
        </div>
      </div>
      {tokenId && (
        <p className="mt-4 text-lg font-semibold text-yellow-300">
          Minting Status: {tokenId}
        </p>
      )}
    </div>
  );
};

export default GoldSwatterMinter;
