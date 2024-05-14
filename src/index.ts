import { Elysia, t } from "elysia";
import { getBalance } from "./weETH";

new Elysia()
  .get("/", () => "Hello Elysia")
  .get(
    "/weeth/:chain/:blockNumber",
    async ({ query, params }) => {
      console.log("params: ", params);
      console.log("query: ", query);
      const addresses = query.addresses?.split(",");
      const blockNumber = BigInt(params.blockNumber);
      const holders = await getBalance(blockNumber, addresses);
      return {
        Result: holders,
      };
    },
    {
      params: t.Object({ blockNumber: t.Numeric(), chain: t.Literal("mode") }),
      query: t.Object({ addresses: t.Optional(t.String()) }),
    }
  )
  .listen(3000);

console.log("Hello, Ionic! Server is running...");
