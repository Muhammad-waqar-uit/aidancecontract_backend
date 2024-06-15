import Web3 from "web3";
import { prisma } from "@/utils/db";
import DAOhandlerApi from "../../../../abi/DAOHandler.json";

const providerURL = process.env.RPC_URL;
const contractAddress = process.env.DAO_Token_Contract;

// Initialize Web3
const web3 = new Web3(new Web3.providers.HttpProvider(providerURL));
const DAOHandler = new web3.eth.Contract(DAOhandlerApi.abi, contractAddress);


export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { senderAddress, campaignId, amountWei } = req.body;

  if (!senderAddress || !campaignId || !amountWei) {
    return res.status(400).json({
      error: "Sender address, campaign ID, and donation amount are required.",
    });
  }

  try {
    // Fetch sender's private key from the database using Prisma
    const sender = await prisma.address.findUnique({
      where: { publicAddress: senderAddress },
    });

    if (!sender) {
      return res.status(404).json({ error: "Sender address not found." });
    }
    // Fetch max donation limit for the campaign from DAO contract
    const maxDonation = await DAOHandler.methods
      .maxCampaignDonation(campaignId)
      .call();
    const receivedDonation = await DAOHandler.methods
      .recieved_Donation(campaignId)
      .call();

    // Check if max donation limit is defined for the campaign
    if (Number(maxDonation) <= 0) {
      return res
        .status(400)
        .json({ error: "This campaign has no max donations." });
    }

    // Check if max donation limit is reached
    if (Number(receivedDonation) + Number(amountWei) > maxDonation) {
      return res.status(400).json({ error: "Max campaign amount reached." });
    }
    // Convert amountWei to BigNumber if needed
    const amount = web3.utils.toBN(amountWei);

    // Estimate gas and gas price
    const gasPrice = await web3.eth.getGasPrice();
    const gasEstimate = await DAOHandler.methods
      .makeDonation(campaignId)
      .estimateGas({ value: amount });

    // Send transaction with makeDonation function call and msg.value
    const receipt = await DAOHandler.methods.makeDonation(campaignId).send({
      from: senderAddress,
      gas: gasEstimate,
      gasPrice: gasPrice,
      value: amount,
    });

    res.status(200).json({
      success: true,
      transactionHash: receipt.transactionHash,
    });
  } catch (error) {
    console.error("Error sending transaction:", error);
    res.status(500).json({ error: "Unable to send transaction." });
  }
}
