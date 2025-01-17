"use client";

import React, { TouchEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useAccount } from "wagmi";
// Add this import
import GoldSwatterMinter from "~~/components/GoldSwatterMinter";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

type FlyType = "normal" | "large";

type Fly = {
  id: string;
  x: number;
  y: number;
  speed: number;
  angle: number;
  dead?: boolean;
  deadTime?: number;
  eatingCroissant?: number;
  type: FlyType;
  hits: number;
};

// Add this new type definition
type SwatterType = "normal" | "gold";

const Game: React.FC = () => {
  const { address: connectedAddress } = useAccount();
  const [flies, setFlies] = useState<Fly[]>([]);
  const [croissants, setCroissants] = useState<{ id: number; x: number; y: number }[]>([]);
  const [score, setScore] = useState(0);
  const [gameStatus, setGameStatus] = useState<"playing" | "lost">("playing");
  const [timeElapsed, setTimeElapsed] = useState(0); // Changed from timeLeft to timeElapsed
  const [speedMultiplier, setSpeedMultiplier] = useState(1.25); // 25% more initial speed
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isClicking, setIsClicking] = useState(false);
  const [maxFlies, setMaxFlies] = useState(1); // Start with 1 fly

  const [showSpeedIncrease, setShowSpeedIncrease] = useState(false);

  // Add this new state to keep track of alive flies
  const [aliveFliesCount, setAliveFliesCount] = useState(0);

  const [lastCroissantPosition, setLastCroissantPosition] = useState({ x: 0, y: 0 });

  const { writeContractAsync: writeGameScoreAsync, isMining } = useScaffoldWriteContract("GameScore");
  const { writeContractAsync: writeMouchDropsAsync, isMining: isClaiming } = useScaffoldWriteContract("MouchDrops");

  const router = useRouter(); // Add this hook

  // Add this hook to read from the GoldSwatter contract
  const { data: hasGoldSwatter } = useScaffoldReadContract({
    contractName: "GoldSwatter",
    functionName: "balanceOf",
    args: [connectedAddress],
    watch: true,
    query: {
      enabled: Boolean(connectedAddress),
      staleTime: Infinity,
      gcTime: Infinity,
    },
  });

  // Replace the current swatter state and effects with:
  const [currentSwatter, setCurrentSwatter] = useState<SwatterType>("normal");

  // Handle localStorage and connection state
  useEffect(() => {
    if (!connectedAddress) {
      setCurrentSwatter("normal");
      return;
    }

    const savedSwatter = localStorage.getItem("hasGoldSwatter");
    if (savedSwatter === "true") {
      setCurrentSwatter("gold");
    }
  }, [connectedAddress]);

  // Handle blockchain data
  useEffect(() => {
    if (!connectedAddress) return;

    if (hasGoldSwatter && BigInt(hasGoldSwatter.toString()) > BigInt(0)) {
      setCurrentSwatter("gold");
      localStorage.setItem("hasGoldSwatter", "true");
    }
  }, [connectedAddress, hasGoldSwatter]);

  // Add these state variables
  const [lastHitTime, setLastHitTime] = useState(0);
  const cooldownTime = 500; // 500ms cooldown

  // Add this new state for animation
  const [isSwinging, setIsSwinging] = useState(false);

  // Add this new state at the top of the component
  const [eatingCroissantIds, setEatingCroissantIds] = useState<number[]>([]);

  const handleSaveScore = async () => {
    try {
      await writeGameScoreAsync({
        functionName: "setHighScore",
        args: [BigInt(score)],
      });
      console.log("Score saved successfully!");
    } catch (error) {
      console.error("Error saving score:", error);
    }
  };

  const handleClaimReward = async () => {
    try {
      const amt = score / timeElapsed;
      await writeMouchDropsAsync({
        functionName: "disburse",
        args: [connectedAddress, BigInt(amt * 10 ** 18)],
      });
      console.log("Reward claimed successfully!");
    } catch (error) {
      console.error("Error claiming reward:", error);
    }
  };

  const createNewFly = useCallback(() => {
    const side = Math.floor(Math.random() * 4);
    // Only allow big flies after 10 seconds, and reduce chance to 10%
    const isBigFly = timeElapsed > 10 && Math.random() < 0.1;
    let x = 0,
      y = 0;

    if (side === 0) {
      x = Math.random() * window.innerWidth;
      y = 0;
    } else if (side === 1) {
      x = window.innerWidth;
      y = Math.random() * window.innerHeight;
    } else if (side === 2) {
      x = Math.random() * window.innerWidth;
      y = window.innerHeight;
    } else {
      x = 0;
      y = Math.random() * window.innerHeight;
    }

    return {
      id: uuidv4(),
      speed: (5 + Math.random() * 5) * speedMultiplier,
      x,
      y,
      angle: 0,
      type: isBigFly ? "large" : "normal",
      hits: 0,
    };
  }, [speedMultiplier, timeElapsed]);

  const spawnFly = useCallback(() => {
    setFlies(prev => {
      if (prev.filter(fly => !fly.dead).length < maxFlies) {
        return [...prev, createNewFly() as Fly];
      }
      return prev;
    });
  }, [createNewFly, maxFlies]);

  const spawnCroissants = useCallback(() => {
    const centerAreaWidth = window.innerWidth * 0.625; // 25% bigger than half
    const centerAreaHeight = window.innerHeight * 0.625; // 25% bigger than half
    const startX = (window.innerWidth - centerAreaWidth) / 2;
    const startY = (window.innerHeight - centerAreaHeight) / 2;

    const initialCroissants: { id: number; x: number; y: number }[] = [];
    const minDistance = 100; // Minimum distance between croissants

    for (let i = 0; i < 6; i++) {
      let newCroissant: { id: number; x: number; y: number } | null = null;
      let attempts = 0;
      const maxAttempts = 50; // Prevent infinite loop

      do {
        newCroissant = {
          id: i,
          x: startX + Math.random() * centerAreaWidth,
          y: startY + Math.random() * centerAreaHeight,
        };

        // Check distance from all existing croissants
        const isTooClose = initialCroissants.some(
          croissant =>
            Math.hypot(croissant.x - (newCroissant?.x ?? 0), croissant.y - (newCroissant?.y ?? 0)) < minDistance,
        );

        if (!isTooClose) {
          initialCroissants.push(newCroissant);
          break;
        }

        attempts++;
      } while (attempts < maxAttempts);

      // If we couldn't place a croissant after max attempts, just place it anyway
      if (attempts === maxAttempts && newCroissant) {
        initialCroissants.push(newCroissant);
      }
    }

    setCroissants(initialCroissants);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let flyIncreaseTimer: NodeJS.Timeout;

    if (gameStatus === "playing") {
      timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);

      // Increase maxFlies every 5 seconds (instead of 3) until it reaches 8 (instead of 10)
      flyIncreaseTimer = setInterval(() => {
        setMaxFlies(prev => Math.min(prev + 1, 8));
      }, 5000); // Changed from 3000 to 5000ms
    }

    return () => {
      if (timer) clearInterval(timer);
      if (flyIncreaseTimer) clearInterval(flyIncreaseTimer);
    };
  }, [gameStatus]);

  useEffect(() => {
    const spawnInterval = setInterval(spawnFly, 1000);

    const speedIncreaseInterval = setInterval(() => {
      setSpeedMultiplier(prev => prev * 1.1); // Reduced from 1.15 to 1.1
      setShowSpeedIncrease(true);
      setTimeout(() => setShowSpeedIncrease(false), 1000);
    }, 8000); // Changed from 5000 to 8000 (8 seconds)

    return () => {
      clearInterval(spawnInterval);
      clearInterval(speedIncreaseInterval);
    };
  }, [spawnFly]);

  useEffect(() => {
    if (gameStatus !== "playing") return;

    const moveFlies = setInterval(() => {
      setFlies(prevFlies => {
        const updatedFlies = prevFlies
          .filter(fly => !fly.dead || (fly.dead && Date.now() - (fly.deadTime || 0) <= 1000))
          .map(fly => {
            if (fly.dead) {
              // Remove dead flies after 1 second
              if (Date.now() - (fly.deadTime || 0) > 1000) {
                return { ...fly, remove: true };
              }
              return fly;
            }

            const nearestCroissant = croissants.reduce((closest, croissant) => {
              const distanceToCurrent = Math.hypot(croissant.x - fly.x, croissant.y - fly.y);
              const distanceToClosest = Math.hypot(closest.x - fly.x, closest.y - fly.y);
              return distanceToCurrent < distanceToClosest ? croissant : closest;
            }, croissants[0]);

            if (fly.eatingCroissant) {
              // Decrease from 2000 to 1000ms (1 second)
              if (Date.now() - fly.eatingCroissant >= 1000) {
                // Remove the croissant after 1 second of eating
                setCroissants(prev => {
                  const newCroissants = prev.filter(c => !(Math.abs(c.x - fly.x) < 15 && Math.abs(c.y - fly.y) < 15));
                  if (newCroissants.length === 0) {
                    setGameStatus("lost");
                  }
                  return newCroissants;
                });
                setEatingCroissantIds(prev => prev.filter(id => id !== nearestCroissant.id));
                return { ...fly, eatingCroissant: undefined };
              } else if (!eatingCroissantIds.includes(nearestCroissant.id)) {
                // Add croissant ID to the flashing list when fly starts eating
                setEatingCroissantIds(prev => [...prev, nearestCroissant.id]);
              }
              // If still eating, don't move the fly
              return fly;
            }

            const angle = Math.atan2(nearestCroissant.y - fly.y, nearestCroissant.x - fly.x);
            const distance = Math.hypot(nearestCroissant.x - fly.x, nearestCroissant.y - fly.y);

            if (distance < 37 && !fly.eatingCroissant) {
              // Start the eating process when the fly touches the croissant
              console.log("Fly started eating:", fly.id);
              return { ...fly, x: nearestCroissant.x, y: nearestCroissant.y, eatingCroissant: Date.now() };
            }

            const jitterX = (Math.random() - 0.5) * 5;
            const jitterY = (Math.random() - 0.5) * 5;
            const speedBoost = croissants.length === 1 ? 1.5 : 1;
            const newX = fly.x + Math.cos(angle) * fly.speed * speedMultiplier * speedBoost + jitterX;
            const newY = fly.y + Math.sin(angle) * fly.speed * speedMultiplier * speedBoost + jitterY;

            // Calculate the angle in degrees and adjust for the fly's orientation
            const angleDegrees = ((angle * 180) / Math.PI + 180) % 360;

            if (newY > window.innerHeight || newX < 0 || newX > window.innerWidth) {
              return { ...fly, remove: true };
            }

            return { ...fly, x: newX, y: newY, angle: angleDegrees };
          })
          .filter((fly): fly is Fly => !(fly as Fly & { remove?: boolean }).remove);

        // Ensure we always have the current maxFlies number of alive flies
        const aliveFliesCount = updatedFlies.filter(fly => !fly.dead).length;
        for (let i = aliveFliesCount; i < maxFlies; i++) {
          updatedFlies.push(createNewFly() as Fly);
        }

        setAliveFliesCount(updatedFlies.filter(fly => !fly.dead).length);

        return updatedFlies;
      });
    }, 50);

    // Move the last croissant every 3 seconds
    const moveCroissantInterval = setInterval(() => {
      if (croissants.length === 1) {
        const newX = Math.random() * (window.innerWidth - 30);
        const newY = Math.random() * (window.innerHeight - 30);
        setCroissants([{ ...croissants[0], x: newX, y: newY }]);
        setLastCroissantPosition({ x: newX, y: newY });
      }
    }, 3000);

    // Cleanup any potential ghost images every second
    const cleanupInterval = setInterval(() => {
      const flyElements = document.querySelectorAll("[data-fly-id]");
      const currentFlyIds = flies.map(fly => fly.id.toString());
      flyElements.forEach(element => {
        const flyId = element.getAttribute("data-fly-id");
        if (flyId && !currentFlyIds.includes(flyId)) {
          element.remove();
        }
      });
    }, 1000);

    return () => {
      clearInterval(moveFlies);
      clearInterval(moveCroissantInterval);
      clearInterval(cleanupInterval);
    };
  }, [croissants, gameStatus, speedMultiplier, flies, createNewFly, maxFlies]);

  const handleFlyClick = useCallback(
    (id: string) => {
      setFlies(prev => {
        let fliesKilled = 0;
        const updatedFlies = prev.map(fly => {
          if (fly.dead) return fly;

          const isInCollisionBox =
            fly.x >= cursorPosition.x - 100 &&
            fly.x <= cursorPosition.x + 100 &&
            fly.y >= cursorPosition.y - 100 &&
            fly.y <= cursorPosition.y + 100;

          if (isInCollisionBox) {
            if (currentSwatter === "gold") {
              fliesKilled++;
              if (fly.eatingCroissant) {
                const eatenCroissant = croissants.find(c => Math.abs(c.x - fly.x) < 15 && Math.abs(c.y - fly.y) < 15);
                if (eatenCroissant) {
                  setEatingCroissantIds(prev => prev.filter(id => id !== eatenCroissant.id));
                }
              }
              return { ...fly, dead: true, speed: 0, deadTime: Date.now(), eatingCroissant: undefined };
            } else {
              // Normal swatter logic...
              if (fly.type === "normal" || (fly.type === "large" && fly.hits === 1)) {
                fliesKilled++;
                if (fly.eatingCroissant) {
                  const eatenCroissant = croissants.find(c => Math.abs(c.x - fly.x) < 15 && Math.abs(c.y - fly.y) < 15);
                  if (eatenCroissant) {
                    setEatingCroissantIds(prev => prev.filter(id => id !== eatenCroissant.id));
                  }
                }
                return { ...fly, dead: true, speed: 0, deadTime: Date.now(), eatingCroissant: undefined };
              } else if (fly.type === "large" && fly.hits === 0) {
                return { ...fly, hits: 1 };
              }
            }
          }
          return fly;
        });

        setScore(prev => prev + fliesKilled);
        return [...updatedFlies];
      });
    },
    [maxFlies, createNewFly, currentSwatter, cursorPosition, croissants],
  );

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    setCursorPosition({ x: event.clientX, y: event.clientY });
  }, []);

  const handleMouseDown = useCallback(() => {
    setIsClicking(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsClicking(false);
  }, []);

  const handleClick = useCallback(() => {
    const currentTime = Date.now();
    if (currentTime - lastHitTime < cooldownTime) {
      return;
    }

    setIsSwinging(true);
    setTimeout(() => setIsSwinging(false), 50); // Changed from 100ms to 50ms for even faster animation

    const collisionBox = {
      left: cursorPosition.x - 100,
      right: cursorPosition.x + 100,
      top: cursorPosition.y - 100,
      bottom: cursorPosition.y + 100,
    };

    const flyToKill = flies.find(
      fly =>
        !fly.dead &&
        fly.x >= collisionBox.left &&
        fly.x <= collisionBox.right &&
        fly.y >= collisionBox.top &&
        fly.y <= collisionBox.bottom,
    );

    if (flyToKill) {
      handleFlyClick(flyToKill.id);
      setLastHitTime(currentTime); // Update the last hit time
    }
  }, [flies, cursorPosition, handleFlyClick, lastHitTime, cooldownTime]);

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    setIsClicking(true);
    const touch = event.touches[0];
    setCursorPosition({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    setCursorPosition({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsClicking(false);
    handleClick();
  }, [handleClick]);

  // Remove the swatter check from resetGame - it's now handled by the useEffect above
  const resetGame = useCallback(() => {
    setFlies([]);
    setCroissants([]);
    setScore(0);
    setGameStatus("playing");
    setTimeElapsed(0);
    setSpeedMultiplier(1.25);
    setMaxFlies(1);
    setAliveFliesCount(0);
    spawnCroissants();
  }, [spawnCroissants]);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  // Function to get the nickname
  const getNickname = useCallback(() => {
    if (connectedAddress) {
      return connectedAddress.slice(-4); // Get last 4 digits of the address
    }
    return "Guest";
  }, [connectedAddress]);

  const handleSeeLeaderboard = useCallback(() => {
    router.push("/leaderboard");
  }, [router]);

  if (gameStatus !== "playing") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="mb-4 text-4xl">Game Over</h1>
          <p className="mb-4 text-2xl">Final Score: {score}</p>
          <p className="mb-4 text-2xl">Time Survived: {timeElapsed} seconds</p>
          <div className="flex justify-center mb-4 space-x-2">
            <button
              className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700"
              onClick={resetGame}
            >
              Play Again
            </button>
            <button
              className="px-4 py-2 font-bold text-white bg-green-500 rounded hover:bg-green-700"
              onClick={handleSaveScore}
              disabled={isMining}
            >
              {isMining ? "Saving..." : "Save Score"}
            </button>
            <button
              className="px-4 py-2 font-bold text-white bg-green-500 rounded hover:bg-green-700"
              onClick={handleClaimReward}
              disabled={isClaiming}
            >
              {isClaiming ? "Claiming..." : "Claim Reward"}
            </button>
            <button
              className="px-4 py-2 font-bold text-white bg-purple-500 rounded hover:bg-purple-700"
              onClick={handleSeeLeaderboard}
            >
              See Leaderboard
            </button>
          </div>
          {/* Add the Gold Swatter Minter component */}
          <div className="mt-4">
            <GoldSwatterMinter price={0.001} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute z-10 px-4 py-2 rounded-full top-4 right-4 bg-primary text-primary-content">
        {getNickname()}
      </div>
      <h1 className="text-2xl text-center">Score: {score}</h1>
      <div className="absolute text-2xl top-4 left-4">Time: {timeElapsed}s</div>
      {croissants.map(croissant => (
        <div
          key={croissant.id}
          className={`absolute pointer-events-none ${eatingCroissantIds.includes(croissant.id) ? "animate-flash" : ""}`}
          style={{
            left: croissant.x,
            top: croissant.y,
          }}
        >
          <Image
            src="/croissant.png"
            alt="Croissant"
            width={75}
            height={75}
            className={`pointer-events-none ${eatingCroissantIds.includes(croissant.id) ? "opacity-50" : ""}`}
          />
        </div>
      ))}
      {flies.map(fly => (
        <div
          key={`fly-container-${fly.id}`}
          className="absolute pointer-events-none"
          style={{
            left: fly.x - (fly.type === "large" ? 100 : 50),
            top: fly.y - (fly.type === "large" ? 100 : 50),
            width: fly.type === "large" ? 200 : 100,
            height: fly.type === "large" ? 200 : 100,
          }}
        >
          <Image
            key={`fly-${fly.id}`}
            data-fly-id={fly.id}
            src={fly.dead ? "/mouch_dead.png" : fly.eatingCroissant ? "/mouch-eating.png" : "/mouch-1.png"}
            alt="Fly"
            width={fly.type === "large" ? 200 : 100}
            height={fly.type === "large" ? 200 : 100}
            className={`transition-opacity duration-1000 pointer-events-none ${fly.dead ? "opacity-0" : "opacity-100"}`}
            style={{
              transform: `rotate(${fly.angle}deg) ${fly.angle > 90 && fly.angle < 270 ? "scaleY(-1)" : ""}`,
              transformOrigin: "center",
            }}
          />
        </div>
      ))}
      <Image
        src={currentSwatter === "gold" ? "/gold_swatter.PNG" : "/fly_swatter.png"}
        alt={`${currentSwatter === "gold" ? "Gold" : "Normal"} Fly Swatter`}
        width={687}
        height={163}
        className="absolute transition-transform pointer-events-none duration-50"
        style={{
          left: cursorPosition.x - 80,
          top: cursorPosition.y - 80,
          transform: `rotate(45deg) ${isSwinging ? "rotate(-15deg) scale(0.95)" : ""}`,
          opacity: 0.75,
          transformOrigin: "80px 80px",
        }}
      />
      {showSpeedIncrease && (
        <div className="absolute px-4 py-2 text-black transform -translate-x-1/2 bg-yellow-400 rounded-full top-12 left-1/2">
          Speed Increased!
        </div>
      )}
      {/* Add this new div for the flies counter */}
      <div className="absolute z-10 px-4 py-2 rounded-full bottom-4 right-4 bg-primary text-primary-content">
        Flies: {aliveFliesCount}/{maxFlies}
      </div>
      {/* Modify the swatter type display */}
      <div className="absolute z-10 px-4 py-2 rounded-full bottom-4 left-4 bg-primary text-primary-content">
        Swatter: {currentSwatter === "gold" ? "Gold" : "Normal"}
        {!connectedAddress && <span className="block text-xs">Connect wallet to use Gold Swatter</span>}
        {connectedAddress && currentSwatter === "normal" && (
          <span className="block text-xs">Get Gold Swatter NFT to upgrade</span>
        )}
      </div>
      {/* You might want to add a visual indicator for the gold swatter */}
      {currentSwatter === "gold" && (
        <div className="absolute z-10 px-4 py-2 text-black transform -translate-x-1/2 bg-yellow-400 rounded-full top-4 left-1/2">
          Gold Swatter Active!
        </div>
      )}
      {croissants.length === 1 && (
        <div className="absolute z-10 px-4 py-2 text-white transform -translate-x-1/2 bg-red-500 rounded-full top-20 left-1/2">
          Last Croissant! Flies are faster!
        </div>
      )}
    </div>
  );
};

export default Game;
