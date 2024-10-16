import { Elysia, t } from "elysia";
import type { Address } from "viem";

import { getBalance } from "./supply";
import { getBorrowers } from "./borrows";

const getAssetAddresses = (chain: string) => {
  let ionweETH: Address;
  let ionwrsETH: Address;

  switch (chain) {
    case "mode": {
      ionweETH = "0xA0D844742B4abbbc43d8931a6Edb00C56325aA18";
      ionwrsETH = "0x49950319aBE7CE5c3A6C90698381b45989C99b46";
      break;
    }
    case "base": {
      ionweETH = "0x84341B650598002d427570298564d6701733c805"; // Base chain address for ionweETH
      ionwrsETH = "0x49950319aBE7CE5c3A6C90698381b45989C99b46"; // Same as in mode
      break;
    }
    default: {
      throw new Error("Unsupported chain");
    }
  }

  return { ionweETH, ionwrsETH };
};
new Elysia()
  .get("/", () => "Hello Elysia")
  .get(
    "/:asset/:chain/:blockNumber",
    async ({ query, params }) => {
      console.log("params: ", params);
      console.log("query: ", query);
      const { ionweETH, ionwrsETH } = getAssetAddresses(params.chain);
      let asset: Address;
      switch (params.asset) {
        case "weeth": {
          asset = ionweETH;
          break;
        }
        case "wrseth": {
          asset = ionwrsETH;
          break;
        }
        default: {
          throw new Error("Invalid asset");
        }
      }

      // If `addresses` is undefined, pass an empty array
      const addresses = query.addresses?.split(",");
      const blockNumber = BigInt(params.blockNumber);

      // Pass chain as well to getBalance function
      const holders = await getBalance(asset, blockNumber, params.chain, addresses);
      return {
        Result: holders,
      };
    },
    {
      params: t.Object({
        asset: t.Union([t.Literal("weeth"), t.Literal("wrseth")]),
        blockNumber: t.Numeric(),
        chain: t.Union([t.Literal("mode"), t.Literal("base")]),   // Add 'base' as an option
      }),
      query: t.Object({ addresses: t.Optional(t.String()) }),
    }
  )
  .get(
    "/borrows/:asset/:chain/:blockNumber",
    async ({ query, params }) => {
      console.log("params: ", params);
      console.log("query: ", query);

      // If `addresses` is undefined, pass an empty array
      const addresses = query.addresses?.split(",");
      const blockNumber = BigInt(params.blockNumber);

      // Pass chain to getBorrowers function
      const borrowers = await getBorrowers(params.asset, blockNumber, addresses);
      return {
        Result: borrowers,
      };
    },
    {
      params: t.Object({
        asset: t.Union([t.Literal("weeth"), t.Literal("wrseth")]),
        blockNumber: t.Numeric(),
        chain: t.Union([t.Literal("mode"), t.Literal("base")]),  // Add 'base' as an option
      }),
      query: t.Object({ addresses: t.Optional(t.String()) }),
    }
  )
  .listen(3000);

console.log("Hello, Ionic! Server is running...");
