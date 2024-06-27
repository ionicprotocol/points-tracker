import { http, type Address } from "viem"; // Import necessary modules from viem library
import { cTokenAbi } from "./abi/cTokenAbi"; // Import ABI for smart contract interaction
import { createConfig, readContracts } from "@wagmi/core"; // Import functions from @wagmi/core
import { mode } from "@wagmi/core/chains"; // Import blockchain mode from @wagmi/core

// Create blockchain configuration for the mode chain using HTTP transport
export const config = createConfig({
  chains: [mode],
  transports: {
    [mode.id]: http(), // Set HTTP transport for the mode chain
  },
});

// Define type for holder information
type Holder = { address: string; effective_balance: string | undefined };

// Function to fetch balances of token holders
export const getBalance = async (
  asset: Address, // Blockchain address of the asset
  blockNumber: bigint, // Block number for contract interaction
  addresses: string[] = [] // Array to store addresses of token holders
): Promise<Holder[]> => {
  const threshold = BigInt("100000000000000"); // Threshold balance in smallest unit (wei)

  // Fetch all pages of token holders' addresses
  if (addresses.length === 0) {
    let nextPageParams;
    while (true) {
      let url = `https://explorer.mode.network/api/v2/tokens/${asset}/holders`;
      if (nextPageParams) {
        url += `?${Object.entries(nextPageParams)
          .map(([key, value]) => `${key}=${value}`)
          .join("&")}`;
      }
      
      try {
        const holdersResponse = await fetch(url);
        if (!holdersResponse.ok) {
          throw new Error(`Failed to fetch data. Status: ${holdersResponse.status}`);
        }
        
        const json:any = await holdersResponse.json();
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
    // Read balances from the blockchain using readContracts function
    const result = await readContracts(config, {
      contracts: addresses.map((addr) => ({
        address: asset,
        abi: cTokenAbi as any,
        functionName: "balanceOfUnderlying",
        args: [addr],
      })),
      blockNumber,
    });
    
    // Process results to filter and map them to Holder objects
    const holders = result.flatMap((res, index) => {
      const balance = res.result as bigint;
      if (res.status !== "failure") {
        totalBalance += balance; // Add balance to total if successful
      } else {
        console.log("Error fetching balance:", res.error);
        return { address: addresses[index], effective_balance: undefined };
      }
      return { address: addresses[index], effective_balance: balance.toString() };
    }).filter((holder) => {
      if (holder.effective_balance) {
        const effectiveBalance = BigInt(holder.effective_balance);
        return effectiveBalance >= threshold; // Filter holders by threshold balance
      }
      return false;
    });

    return holders as Holder[]; // Return filtered holders
  } catch (error) {
    console.error("Error reading contracts:", error);
    return []; // Return empty array on error
  }
};
