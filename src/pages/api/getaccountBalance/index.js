import Web3 from "web3";

// Initialize Web3
const providerURL = process.env.RPC_URL; // Your RPC URL
const web3 = new Web3(new Web3.providers.HttpProvider(providerURL));

/**
 * Get native chain balance for a given address.
 * @param {string} address - The address to get the balance for.
 * @returns {Promise<string>} - The balance in Ether.
 */
export default async function handler(req, res) {
    const { address } = req.query; // Assuming you will pass the campaign ID as a query parameter

    if (req.method !== "GET") {
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
    if (!address) {
      return res.status(400).json({ error: "address is required." });
    }

  try {
    const balanceWei = await web3.eth.getBalance(address);
    const balanceEth = web3.utils.fromWei(balanceWei, "ether");
    res.status(200).json({ Balance: balanceEth ,Symbol:"Matic"});
  } catch (error) {
    console.error("Error fetching balance:", error);
    throw new Error("Unable to fetch balance.");
  }
};
