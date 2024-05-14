import { Elysia } from "elysia";
import { getBalance } from "./weETH";

new Elysia()
  .get("/", () => "Hello Elysia")
  .get("/weeth/:blockNumber", async ({ query, path }) => {
    console.log("path: ", path);
    console.log(query);
    const addresses = query.addresses?.split(",");
    console.log("addresses: ", addresses);
    const blockNumber = BigInt(path.split("/").pop()!);
    console.log("blockNumber: ", blockNumber);
    const holders = await getBalance(blockNumber, addresses);
    return {
      Result: holders,
    };
  })
  .listen(3000);
