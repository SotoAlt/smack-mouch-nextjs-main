"use client";

import React, { TouchEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useRouter } from "next/navigation"; // Add this import
import GoldSwatterMinter from "~~/components/GoldSwatterMinter";

type FlyType = 'normal' | 'large';

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
type SwatterType = 'normal' | 'gold';

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

  // Add this new state variable for the current swatter type
  const [currentSwatter, setCurrentSwatter] = useState<SwatterType>('normal');

  const { writeContractAsync: writeGameScoreAsync, isMining } = useScaffoldWriteContract("GameScore");

  const router = useRouter(); // Add this hook

  // Add this hook to read from the GoldSwatter contract
  const { data: hasGoldSwatter } = useScaffoldReadContract({
    contractName: "GoldSwatter",
    functionName: "balanceOf",
    args: [connectedAddress],
  });

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

  const createNewFly = useCallback(() => {
    const side = Math.floor(Math.random() * 4);
    const isBigFly = Math.random() < 0.2; // 20% chance for a big fly
    const newFly: Fly = {
      id: uuidv4(),
      speed: (5 + Math.random() * 5) * speedMultiplier,
      x: 0,
      y: 0,
      angle: 0,
      type: isBigFly ? 'large' : 'normal',
      hits: 0,
    };

    if (side === 0) {
      newFly.x = Math.random() * window.innerWidth;
      newFly.y = 0;
    } else if (side === 1) {
      newFly.x = window.innerWidth;
      newFly.y = Math.random() * window.innerHeight;
    } else if (side === 2) {
      newFly.x = Math.random() * window.innerWidth;
      newFly.y = window.innerHeight;
    } else {
      newFly.x = 0;
      newFly.y = Math.random() * window.innerHeight;
    }

    return newFly;
  }, [speedMultiplier]);

  const spawnFly = useCallback(() => {
    setFlies(prev => {
      if (prev.filter(fly => !fly.dead).length < maxFlies) {
        return [...prev, createNewFly()];
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

      // Increase maxFlies every 3 seconds until it reaches 10
      flyIncreaseTimer = setInterval(() => {
        setMaxFlies(prev => Math.min(prev + 1, 10));
      }, 3000); // This remains at 3000ms (3 seconds)
    }

    return () => {
      if (timer) clearInterval(timer);
      if (flyIncreaseTimer) clearInterval(flyIncreaseTimer);
    };
  }, [gameStatus]);

  useEffect(() => {
    const spawnInterval = setInterval(spawnFly, 1000);

    const speedIncreaseInterval = setInterval(() => {
      setSpeedMultiplier(prev => prev * 1.15);
      setShowSpeedIncrease(true);
      setTimeout(() => setShowSpeedIncrease(false), 1000);
    }, 5000); // Changed from 2000 to 5000 (5 seconds)

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

            if (fly.eatingCroissant) {
              // If the fly is eating a croissant, check if 0.5 seconds have passed
              if (Date.now() - fly.eatingCroissant >= 500) {
                // Remove the croissant after 0.5 seconds of eating
                setCroissants(prev => {
                  const newCroissants = prev.filter(c => !(Math.abs(c.x - fly.x) < 15 && Math.abs(c.y - fly.y) < 15));
                  if (newCroissants.length === 0) {
                    setGameStatus("lost");
                  }
                  return newCroissants;
                });
                // Reset the eatingCroissant property and allow the fly to move again
                return { ...fly, eatingCroissant: undefined };
              }
              // If still eating, don't move the fly
              return fly;
            }

            const nearestCroissant = croissants.reduce((closest, croissant) => {
              const distanceToCurrent = Math.hypot(croissant.x - fly.x, croissant.y - fly.y);
              const distanceToClosest = Math.hypot(closest.x - fly.x, closest.y - fly.y);
              return distanceToCurrent < distanceToClosest ? croissant : closest;
            }, croissants[0]);

            const angle = Math.atan2(nearestCroissant.y - fly.y, nearestCroissant.x - fly.x);
            const distance = Math.hypot(nearestCroissant.x - fly.x, nearestCroissant.y - fly.y);

            if (distance < 15 && !fly.eatingCroissant) {
              // Start the eating process when the fly touches the croissant
              console.log("Fly started eating:", fly.id);
              return { ...fly, x: nearestCroissant.x, y: nearestCroissant.y, eatingCroissant: Date.now() };
            }

            const jitterX = (Math.random() - 0.5) * 5;
            const jitterY = (Math.random() - 0.5) * 5;
            const newX = fly.x + Math.cos(angle) * fly.speed * speedMultiplier + jitterX;
            const newY = fly.y + Math.sin(angle) * fly.speed * speedMultiplier + jitterY;

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
          updatedFlies.push(createNewFly());
        }

        setAliveFliesCount(updatedFlies.filter(fly => !fly.dead).length);

        return updatedFlies;
      });
    }, 50);

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
            if (currentSwatter === 'gold') {
              // Gold swatter kills any fly in one hit
              fliesKilled++;
              return { ...fly, dead: true, speed: 0, deadTime: Date.now() };
            } else {
              // Normal swatter
              if (fly.type === 'normal' || (fly.type === 'large' && fly.hits === 1)) {
                fliesKilled++;
                return { ...fly, dead: true, speed: 0, deadTime: Date.now() };
              } else if (fly.type === 'large' && fly.hits === 0) {
                return { ...fly, hits: 1 };
              }
            }
          }
          return fly;
        });

        // Count alive flies
        const aliveFliesCount = updatedFlies.filter(fly => !fly.dead).length;

        // Spawn new flies to maintain the current maxFlies number of alive flies
        const newFlies = [];
        for (let i = aliveFliesCount; i < maxFlies; i++) {
          newFlies.push(createNewFly());
        }

        // Update the score here, inside the setFlies callback
        setScore(prev => prev + fliesKilled);

        return [...updatedFlies, ...newFlies];
      });
    },
    [maxFlies, createNewFly, currentSwatter, cursorPosition]
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
    }
  }, [flies, cursorPosition, handleFlyClick]);

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

  // Add this useEffect to set the swatter type based on the contract read result
  useEffect(() => {
    if (hasGoldSwatter && BigInt(hasGoldSwatter.toString()) > BigInt(0)) {
      setCurrentSwatter('gold');
    } else {
      setCurrentSwatter('normal');
    }
  }, [hasGoldSwatter]);

  // Modify the resetGame function to include swatter type reset
  const resetGame = useCallback(() => {
    setFlies([]);
    setCroissants([]);
    setScore(0);
    setGameStatus("playing");
    setTimeElapsed(0);
    setSpeedMultiplier(1.25);
    setMaxFlies(1);
    setAliveFliesCount(0);
    // Set the swatter type based on the contract read result
    if (hasGoldSwatter && BigInt(hasGoldSwatter.toString()) > BigInt(0)) {
      setCurrentSwatter('gold');
    } else {
      setCurrentSwatter('normal');
    }
    spawnCroissants();
  }, [spawnCroissants, hasGoldSwatter]);

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
    router.push('/leaderboard');
  }, [router]);

  if (gameStatus !== "playing") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-4xl mb-4">Game Over</h1>
          <p className="text-2xl mb-4">Final Score: {score}</p>
          <p className="text-2xl mb-4">Time Survived: {timeElapsed} seconds</p>
          <div className="flex justify-center space-x-2 mb-4">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={resetGame}
            >
              Play Again
            </button>
            <button
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              onClick={handleSaveScore}
              disabled={isMining}
            >
              {isMining ? "Saving..." : "Save Score"}
            </button>
            <button
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
              onClick={handleSeeLeaderboard}
            >
              See Leaderboard
            </button>
          </div>
          {/* Add the Gold Swatter Minter component */}
          <div className="mt-4">
            <GoldSwatterMinter />
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
      <div className="absolute top-4 right-4 bg-primary text-primary-content px-4 py-2 rounded-full z-10">
        {getNickname()}
      </div>
      <h1 className="text-center text-2xl">Score: {score}</h1>
      <div className="absolute top-4 left-4 text-2xl">Time: {timeElapsed}s</div>
      {croissants.map(croissant => (
        <div
          key={croissant.id}
          className="absolute"
          style={{
            left: croissant.x,
            top: croissant.y,
            width: 30,
            height: 30,
            backgroundColor: "yellow",
            clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          }}
        />
      ))}
      {flies.map(fly => (
        <div
          key={`fly-container-${fly.id}`}
          className="absolute pointer-events-none"
          style={{
            left: fly.x - (fly.type === 'large' ? 100 : 50),
            top: fly.y - (fly.type === 'large' ? 100 : 50),
            width: fly.type === 'large' ? 200 : 100,
            height: fly.type === 'large' ? 200 : 100,
          }}
        >
          <Image
            key={`fly-${fly.id}`}
            data-fly-id={fly.id}
            src={fly.dead ? "/mouch_dead.png" : fly.eatingCroissant ? "/mouch-eating.png" : "/mouch-1.png"}
            alt="Fly"
            width={fly.type === 'large' ? 200 : 100}
            height={fly.type === 'large' ? 200 : 100}
            className={`transition-opacity duration-1000 ${fly.dead ? "opacity-0" : "opacity-100"}`}
            style={{
              transform: `rotate(${fly.angle}deg) ${fly.angle > 90 && fly.angle < 270 ? "scaleY(-1)" : ""}`,
              transformOrigin: "center",
            }}
          />
        </div>
      ))}
      <Image
        src="/FLY_SWATTER.png"
        alt="Fly Swatter"
        width={687}
        height={163}
        className="absolute pointer-events-none"
        style={{
          left: cursorPosition.x - 80,
          top: cursorPosition.y - 80,
          transform: "rotate(45deg)",
          opacity: 0.75,
          transformOrigin: "80px 80px",
        }}
      />
      {isClicking && (
        <div
          className="absolute border-2 border-red-500 pointer-events-none"
          style={{
            left: cursorPosition.x - 100,
            top: cursorPosition.y - 100,
            width: 200,
            height: 200,
          }}
        />
      )}
      {showSpeedIncrease && (
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black px-4 py-2 rounded-full">
          Speed Increased!
        </div>
      )}
      {/* Add this new div for the flies counter */}
      <div className="absolute bottom-4 right-4 bg-primary text-primary-content px-4 py-2 rounded-full z-10">
        Flies: {aliveFliesCount}/{maxFlies}
      </div>
      {/* Add this somewhere in your JSX to display the current swatter type */}
      <div className="absolute bottom-4 left-4 bg-primary text-primary-content px-4 py-2 rounded-full z-10">
        Swatter: {currentSwatter === 'gold' ? 'Gold' : 'Normal'}
      </div>
      {/* You might want to add a visual indicator for the gold swatter */}
      {currentSwatter === 'gold' && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black px-4 py-2 rounded-full z-10">
          Gold Swatter Active!
        </div>
      )}
    </div>
  );
};

export default Game;
