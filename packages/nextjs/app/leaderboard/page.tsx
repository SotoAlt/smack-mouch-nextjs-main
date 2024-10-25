"use client";

import React, { useEffect, useState } from "react";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const Leaderboard: React.FC = () => {
  const [topScores, setTopScores] = useState<{ player: string; score: bigint }[]>([]);

  const { data: scores, refetch } = useScaffoldReadContract({
    contractName: "GameScore",
    functionName: "getTopScores",
  });

  useEffect(() => {
    if (scores) {
      setTopScores([...scores]); // Create a new array to remove readonly constraint
    }
  }, [scores]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-200">
      <div className="w-full max-w-2xl p-8 bg-base-100 shadow-xl rounded-box">
        <h1 className="text-4xl font-bold mb-8 text-center">Leaderboard</h1>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="bg-primary text-primary-content">
                <th className="text-left py-3 px-4">RANK</th>
                <th className="text-left py-3 px-4">PLAYER</th>
                <th className="text-right py-3 px-4">SCORE</th>
              </tr>
            </thead>
            <tbody>
              {topScores.map((entry, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-base-200" : "bg-base-100"}>
                  <td className="py-3 px-4 font-semibold">{index + 1}</td>
                  <td className="py-3 px-4">
                    <span className="font-mono">{entry.player.slice(0, 6)}...{entry.player.slice(-4)}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold">{entry.score.toString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
