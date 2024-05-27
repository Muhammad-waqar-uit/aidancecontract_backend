import Web3 from "web3";
import TokenAPI from "../../../abi/TokenContract.json";

const providerURL = process.env.RPC_URL;
const contractAddress = process.env.Vote_Token_Contract;

// Initialize Web3
const web3 = new Web3(new Web3.providers.HttpProvider(providerURL));
const tokenContract = new web3.eth.Contract(TokenAPI.abi, contractAddress);

export default async function handler(req, res) {
  const { address } = req.query;

  if (req.method !== "GET") {
    return res
      .setHeader("Allow", ["GET"])
      .status(405)
      .end(`Method ${req.method} Not Allowed`);
  }

  if (!address) {
    return res.status(400).json({ error: "Address is required." });
  }

  try {
    const balance = await tokenContract.methods.balanceOf(address).call();
    return res
      .status(200)
      .json({ address, balance: web3.utils.fromWei(balance, "ether") });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
