import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import MouchDropsContract from "~~/contracts/deployedContracts";
import { monadDevnet } from "~~/scaffold.config";

if (!process.env.VALIDATOR_KEY) {
  throw new Error("VALIDATOR_KEY is missing in environment variables.");
}

if (!process.env.NEXT_PUBLIC_MONAD_RPC_URL) {
  throw new Error("NEXT_PUBLIC_MONAD_RPC_URL is missing in environment variables.");
}

const transport = http(process.env.NEXT_PUBLIC_MONAD_RPC_URL);
const account = privateKeyToAccount(`0x${process.env.VALIDATOR_KEY}`);

export async function POST(req: Request) {
  try {
    const { connectedAddress, amount } = await req.json();

    if (!connectedAddress || !amount) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const client = createWalletClient({
      account,
      chain: monadDevnet,
      transport,
    });

    const publicClient = createPublicClient({
      chain: monadDevnet,
      transport,
    });

    const hash = await client.writeContract({
      address: MouchDropsContract[20143].MouchDrops.address,
      functionName: "disburse",
      abi: MouchDropsContract[20143].MouchDrops.abi,
      args: [connectedAddress, BigInt(Math.round(amount * 10 ** 18))],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ success: true, txHash: receipt.transactionHash });
  } catch (error) {
    // Extract the actual reason from the error message
    let errorMessage = "Transaction failed";
    const errorMsg = error instanceof Error ? error.message : String(error);
    const match = errorMsg.match(/reverted with the following reason:\n(.+)\n\nContract Call/);
    if (match) {
      errorMessage = match[1]; // Extracts the specific error reason
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
