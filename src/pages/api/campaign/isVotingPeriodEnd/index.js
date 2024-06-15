import Web3 from "web3";
import DAOhandlerApi from "../../../../abi/DAOHandler.json";

const providerURL = process.env.RPC_URL; // Your RPC URL
const privateKey = process.env.SuperPrivateKey; // Your private key
const contractAddress = process.env.DAO_Token_Contract; // Your contract address
const contractABI = DAOhandlerApi.abi;

// Initialize Web3
const web3 = new Web3(new Web3.providers.HttpProvider(providerURL));
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(account);

export default async function handler(req, res) {
  const { campaignId } = req.query; // Assuming you will pass the campaign ID as a query parameter

  if (req.method !== "GET") {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  if (!campaignId) {
    return res.status(400).json({ error: "Campaign id is required." });
  }

  try {
    const DAOHandler = new web3.eth.Contract(contractABI, contractAddress);
    const tokenIds = await DAOHandler.methods._tokenIds().call();

    const tokenIdsNumber = Number(tokenIds.toString());
    const campaignIdNumber = Number(campaignId);

    console.log("Token IDs:", tokenIdsNumber);
    console.log("Campaign ID:", campaignIdNumber);

    if (tokenIdsNumber <= 0) {
      return res.status(400).json({ error: "No campaigns exist." });
    }

    if (campaignIdNumber <= 0 || campaignIdNumber > tokenIdsNumber) {
      return res.status(400).json({ error: "Campaign ID does not exist." });
    }

    const ifTimeEnded = await DAOHandler.methods
      .isVotingPeriodEnded(campaignIdNumber)
      .call();

    res
      .status(200)
      .json({ campaignId: campaignIdNumber, TimeEnded: ifTimeEnded });
  } catch (error) {
    console.error("Error fetching campaign details:", error);
    res.status(500).json({
      error: "An error occurred while fetching the voting period end status.",
    });
  }
}
