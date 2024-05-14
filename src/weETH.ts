import { http } from "viem";
import { ionWeETHAbi } from "./ionWeETHAbi";
import { createConfig, readContracts } from "@wagmi/core";
import { mode } from "@wagmi/core/chains";

const ionweETH = "0xA0D844742B4abbbc43d8931a6Edb00C56325aA18";

export const config = createConfig({
  chains: [mode],
  transports: {
    [mode.id]: http(),
  },
});

type Holder = { address: string; effective_balance: string };
export const getBalance = async (
  blockNumber: bigint,
  addresses: string[] = []
): Promise<Holder[]> => {
  if (addresses.length === 0) {
    let nextPageParams;
    while (true) {
      let url = `https://explorer.mode.network/api/v2/tokens/${ionweETH}/holders`;
      if (nextPageParams) {
        url += `?${Object.entries(nextPageParams)
          .map(([key, value]) => `${key}=${value}`)
          .join("&")}`;
      }
      const holders = await fetch(url);
      const json: any = await holders.json();
      const _addresses = json.items.map((holder: any) => holder.address.hash);
      addresses.push(..._addresses);
      if (!json.next_page_params) {
        break;
      }
      nextPageParams = json.next_page_params;
      console.log("nextPageParams: ", nextPageParams);
      console.log("fetching next page...");
    }
  }

  let totalBalance = 0n;

  const result = await readContracts(config, {
    contracts: addresses.map((addr) => {
      return {
        address: ionweETH,
        abi: ionWeETHAbi as any,
        functionName: "balanceOfUnderlying",
        args: [addr],
      };
    }),
    blockNumber,
  });
  const holders = result
    .map((res, index) => {
      const balance = res.result as bigint;
      if (res.status !== "failure") {
        totalBalance += balance;
      } else {
        console.log("error: ", res.error);
        return {};
      }
      return {
        address: addresses[index],
        effective_balance: balance.toString(),
      };
    })
    .filter(
      (holder) => holder.effective_balance && holder.effective_balance !== "0"
    );

  return holders as Holder[];
};
