import { http, type Address } from "viem"; 
import { cTokenAbi } from "./abi/cTokenAbi"; 
import { createConfig, readContracts } from "@wagmi/core"; 
import { mode, base } from "@wagmi/core/chains"; // Import the base chain configuration

// Configuration for both mode and base chains
export const config = createConfig({
  chains: [mode, base], 
  transports: {
    [mode.id]: http(), 
    [base.id]: http(), 
  },
});

type Holder = { address: string; effective_balance: string | undefined };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
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
  console.log("address",asset)
  switch (chain) {
    case "mode":
      return `https://explorer.mode.network/api/v2/tokens/${asset}/holders`;
    case "base":
      return `https://api.basescan.org/api/v2/token/${asset}/holders`;
    default:
      throw new Error("Unsupported chain");
  }
};

export const getBalance = async (
  asset: Address, 
  blockNumber: bigint, 
  chain: string,    // Added `chain` parameter to handle multiple chains
  addresses: string[] = [] 
): Promise<Holder[]> => {
  const threshold = BigInt("100000000000000"); // Threshold balance in smallest unit (wei)
  
  if (addresses.length === 0) {
    let nextPageParams;// Use a generic type for pagination params
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

