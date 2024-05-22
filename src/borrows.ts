import type { Address } from "viem";

const marketNames = {
  weeth: "weeth_market_new",
  wrseth: "wrsteth_market",
};

export const getBorrowers = async (
  asset: "wrseth" | "weeth",
  blockNumber: number,
  addresses: string[] = []
) => {
  const marketName = marketNames[asset];
  if (!marketName) {
    throw new Error("Invalid asset");
  }
  console.log("blockNumber: ", blockNumber);
  console.log("addresses: ", addresses);

  const apiKey = process.env.UNMARSHAL_API_KEY;
  if (!apiKey) {
    throw new Error("UNMARSHAL_API_KEY is not defined");
  }

  // Debugging statement to check if the API key is read correctly
  console.log("UNMARSHAL_API_KEY is being read correctly:", apiKey ? apiKey.substring(0, 4) + '...' : 'undefined');

  const apiUrl = `https://api.unmarshal.com/v1/parser/a640fbce-88bd-49ee-94f7-3239c6118099/execute?auth_key=${apiKey}`;

  const query = `
    SELECT 
      address, borrowed FROM ( 
      SELECT 
        address, 
        sum(tokens) AS borrowed FROM ( 
          SELECT 
            tx_from AS address, 
            Date_bin ('''1 hour''', block_time, '''2000-1-1''') AS date, 
            -event_repay_amount AS tokens 
          FROM ${marketName}.repay_borrow_events 
          WHERE event_repay_amount < pow(10,60) AND block_number < ${blockNumber} ${
            addresses.length > 0
              ? " AND tx_from IN (" +
                addresses.map((a) => `'${a.toLowerCase()}'`).join(",") +
                ")"
              : ""
          } UNION ALL 
          SELECT 
            event_borrower AS address, 
            Date_bin ('''1 hour''', block_time, '''2000-1-1''') AS date, 
            event_borrow_amount AS tokens 
          FROM ${marketName}.borrow_events 
          WHERE block_number < ${blockNumber} ${
            addresses.length > 0
              ? " AND event_borrower IN (" +
                addresses.map((a) => `'${a.toLowerCase()}'`).join(",") +
                ")"
              : ""
          }
        ) AS borrowers 
        GROUP BY address 
      ) AS final_borrowers 
    WHERE borrowed > 0`;

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`API request failed with status ${res.status}`);
  }

  const data: any = await res.json();
  console.log("data: ", data);
  return data.data.rows.map((row: any) => {
    return { address: row[0], borrow_amount: row[1].toString() };
  });
};
