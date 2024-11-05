import { http, type Address } from "viem";
import { cTokenAbi } from "./abi/cTokenAbi";
import { createConfig, readContracts } from "@wagmi/core";
import { mode, base, optimism } from "@wagmi/core/chains"; // Import the mode and base chain configuration

// Dynamic configuration based on the chain
const getDynamicConfig = (chain: string) => {
  switch (chain) {
    case "mode":
      return createConfig({
        chains: [mode],
        transports: {
          [mode.id]: http(),
        },
      });
    case "base":
      return createConfig({
        chains: [base],
        transports: {
          [base.id]: http(),
        },
      });
      case "optimism":
        return createConfig({
          chains: [optimism],
          transports: {
            [optimism.id]: http(),
          },
        });
    default:
      throw new Error("Unsupported chain");
  }
};

type Holder = { address: string; effective_balance: string | undefined };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch data with retries and exponential backoff
const fetchWithRetries = async (url: string, retries = 3, backoff = 1000): Promise<any> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch data. Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt < retries) {
        await sleep(backoff * attempt); // Exponential backoff
      } else {
        throw error;
      }
    }
  }
};

// Helper function to get the API base URL for each chain
const getApiUrl = (chain: string, asset: Address) => {
  console.log("address", asset);
  switch (chain) {
    case "mode":
      return `https://explorer.mode.network/api/v2/tokens/${asset}/holders`;
    case "base":
      return `https://base.blockscout.com/api/v2/tokens/${asset}/holders`;
    case "optimism":
      return `https://optimism.blockscout.com/api/v2/tokens/${asset}/holders`;
    default:
      throw new Error("Unsupported chain");
  }
};

// Main function to get balance of holders
export const getBalance = async (
  asset: Address,
  blockNumber: bigint,
  chain: string, // Added `chain` parameter to handle multiple chains
  addresses: string[] = []
): Promise<Holder[]> => {
  const threshold = BigInt("100000000000000"); // Threshold balance in smallest unit (wei)

  // Get dynamic config based on chain
  const config = getDynamicConfig(chain); // Dynamically choose the config

  if (addresses.length === 0) {
    let nextPageParams; // Use a generic type for pagination params
    while (true) {
      let url = getApiUrl(chain, asset); // Use chain-specific API URL
      if (nextPageParams) {
        url += `?${Object.entries(nextPageParams)
          .map(([key, value]) => `${key}=${value}`)
          .join("&")}`;
      }
      try {
        const json = await fetchWithRetries(url);
        const _addresses = json.items.map((holder: any) => holder.address.hash);
        addresses.push(..._addresses);
        if (!json.next_page_params) {
          break; // Exit the loop if there are no more pages
        }
        nextPageParams = json.next_page_params;
        console.log("nextPageParams: ", nextPageParams);
        console.log("fetching next page...");
      } catch (error) {
        console.error("Error fetching token holders:", error);
        break; // Exit the loop on error
      }
    }
  }

  let totalBalance = 0n; // Initialize total balance as a BigInt
  try {
    const result = await readContracts(config, {
      contracts: addresses.map((addr) => ({
        address: asset,
        abi: cTokenAbi as any,
        functionName: "balanceOfUnderlying",
        args: [addr],
      })),
      blockNumber,
    });
    const holders = result.flatMap((res, index) => {
      const balance = res.result as bigint;
      if (res.status !== "failure") {
        totalBalance += balance;
      } else {
        console.log("Error fetching balance:", res.error);
        return { address: addresses[index], effective_balance: undefined };
      }
      return { address: addresses[index], effective_balance: balance.toString() };
    }).filter((holder) => {
      if (holder.effective_balance) {
        const effectiveBalance = BigInt(holder.effective_balance);
        return effectiveBalance >= threshold;
      }
      return false;
    });
    return holders as Holder[];
  } catch (error) {
    console.error("Error reading contracts:", error);
    return [];
  }
};
