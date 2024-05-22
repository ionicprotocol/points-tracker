import { Elysia, t } from "elysia";
import type { Address } from "viem";

import { getBalance } from "./supply";
import { getBorrowers } from "./borrows";

const ionweETH = "0xA0D844742B4abbbc43d8931a6Edb00C56325aA18";
const ionwrsETH = "0x49950319aBE7CE5c3A6C90698381b45989C99b46";

new Elysia()
  .get("/", () => "Hello Elysia")
  .get(
    "/:asset/:chain/:blockNumber",
    async ({ query, params }) => {
      console.log("params: ", params);
      console.log("query: ", query);
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
      const addresses = query.addresses?.split(",");
      const blockNumber = BigInt(params.blockNumber);
      const holders = await getBalance(asset, blockNumber, addresses);
      return {
        Result: holders,
      };
    },
    {
      params: t.Object({
        asset: t.Union([t.Literal("weeth"), t.Literal("wrseth")]),
        blockNumber: t.Numeric(),
        chain: t.Literal("mode"),
      }),
      query: t.Object({ addresses: t.Optional(t.String()) }),
    }
  )
  .get(
    "/borrows/:asset/:chain/:blockNumber",
    async ({ query, params }) => {
      console.log("params: ", params);
      console.log("query: ", query);
      const addresses = query.addresses?.split(",");
      const blockNumber = params.blockNumber;
      const holders = await getBorrowers(params.asset, blockNumber, addresses);
      return {
        Result: holders,
      };
    },
    {
      params: t.Object({
        asset: t.Union([t.Literal("weeth"), t.Literal("wrseth")]),
        blockNumber: t.Numeric(),
        chain: t.Literal("mode"),
      }),
      query: t.Object({ addresses: t.Optional(t.String()) }),
    }
  )
  .listen(3000);

console.log("Hello, Ionic! Server is running...");
