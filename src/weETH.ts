import { createPublicClient, getContract, http } from "viem";
import { mode } from "viem/chains";
import { ionWeETHAbi } from "./ionWeETHAbi";

const ionweETH = "0xA0D844742B4abbbc43d8931a6Edb00C56325aA18";

const client = createPublicClient({
  chain: mode,
  transport: http(),
});

const contract = getContract({
  address: ionweETH,
  abi: ionWeETHAbi,
  client,
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
    console.log("addresses: ", addresses);
  }

  const exchangeRate = (await contract.read.exchangeRateCurrent()) as bigint;
  console.log("exchangeRate: ", exchangeRate);

  let totalBalance = 0n;

  let i = 0;
  const holders: Holder[] = [];
  for (const address of addresses) {
    const balance = (await contract.read.balanceOfUnderlying([address], {
      blockNumber,
    })) as bigint;
    console.log(`${i++}/${addresses.length}`);
    console.log(
      `Address: ${address}, Balance: ${
        // (tokenBalance / exchangeRate) * BigInt(1e18)
        balance
      }`
    );
    totalBalance += balance;
    holders.push({ address, effective_balance: balance.toString() });
  }
  console.log("totalBalance: ", totalBalance);
  return holders;
};
