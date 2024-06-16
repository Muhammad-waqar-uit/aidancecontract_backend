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
    return res.status(400).json({
      error: "Campaign id is required.",
    });
  }

  try {
    const contract = new web3.eth.Contract(contractABI, contractAddress);
    const maxDonation = await contract.methods
      .recieved_Donation(campaignId)
      .call();
    const maxDonationInEth = web3.utils.fromWei(
      maxDonation.toString(),
      "ether"
    );

    res.status(200).json({
      campaignId: campaignId,
      MaxRecievedDonation_Total: `${maxDonationInEth.toString()}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "An error occurred while fetching the max recieved donation.",
    });
  }
}
