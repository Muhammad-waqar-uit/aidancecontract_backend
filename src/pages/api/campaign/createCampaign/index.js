import Web3 from "web3";
import DAOhandlerApi from "../../../../abi/DAOHandler.json";
import { parseEther } from "viem";

const providerURL = process.env.RPC_URL; // Your RPC URL
const privateKey = process.env.SuperPrivateKey; // Your private key
const contractAddress = process.env.DAO_Token_Contract; // Your contract address
const contractABI = DAOhandlerApi.abi;

// Initialize Web3
const web3 = new Web3(new Web3.providers.HttpProvider(providerURL));
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(account);

export default async function handler(req, res) {
  const {
    ngoRegisterationNo,
    address,
    votingHours,
    totalBeneficiary,
    tokenUri,
    maxDonation,
  } = req.body;

  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (
    !ngoRegisterationNo ||
    !address ||
    !votingHours ||
    !totalBeneficiary ||
    !tokenUri ||
    !maxDonation
  ) {
    return res
      .status(400)
      .json({
        error:
          "NGO registration number, address, voting hours, total beneficiary, tokenUri, and Max Donation are required.",
      });
  }

  if (
    ngoRegisterationNo === 0 ||
    votingHours === 0 ||
    totalBeneficiary === 0 ||
    maxDonation === 0
  ) {
    return res.status(400).json({
      error:
        "NGO registration number, voting hours, total beneficiary, and Max Donation cannot be zero.",
    });
  }

  try {
    const DAOHandler = new web3.eth.Contract(contractABI, contractAddress);

    const ifExist = await DAOHandler.methods
      .registeredNGOs(ngoRegisterationNo)
      .call();

    if (!ifExist) {
      return res.status(400).json({
        error: "NGO does not exist or not accepted to create campaign.",
      });
    }


    const ethamountone = parseEther(maxDonation);

    const ethamount = Number(ethamountone);

    const gasEstimate = await web3.eth.estimateGas({
      from: account.address,
      to: contractAddress,
      data: DAOHandler.methods
        .createProposal(
          votingHours,
          totalBeneficiary,
          ngoRegisterationNo,
          tokenUri,
          ethamount,
          address
        )
        .encodeABI(),
    });

    const tx = await DAOHandler.methods
      .createProposal(
        votingHours,
        totalBeneficiary,
        ngoRegisterationNo,
        tokenUri,
        ethamount,
        address
      )
      .send({
        from: account.address,
        gas: gasEstimate,
      });

    console.log("Transaction Receipt:", tx);
    
    const tokenId = await DAOHandler.methods._tokenIds().call();

    return res.status(200).json({
      message: "Transaction successful",
      transactionHash: tx.transactionHash,
      registrationNo: ngoRegisterationNo,
      address: address,
      tokenId: tokenId.toString(),
    });

  } catch (error) {
    console.error("Transaction Error:", error);
    return res
      .status(500)
      .json({ error: "Transaction failed", details: error.message });
  }
}
