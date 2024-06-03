// pages/api/ngo/registerNgo.js

import Web3 from "web3";
import DAOhandlerApi from "../../../../abi/DAOHandler.json";
import TokenAPI from "../../../../abi/TokenContract.json";
const providerURL = process.env.RPC_URL; // Your RPC URL
const privateKey = process.env.SuperPrivateKey; // Your private key
const contractAddress = process.env.DAO_Token_Contract; // Your contract address
const contractABI = DAOhandlerApi.abi;
const TokenContractAddress = process.env.Vote_Token_Contract;

// Initialize Web3
const web3 = new Web3(new Web3.providers.HttpProvider(providerURL));
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(account);

export default async function handler(req, res) {
  const { ngoRegisterationNo, address } = req.body;

  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (!ngoRegisterationNo || !address) {
    return res
      .status(400)
      .json({ error: "NGO registration number and address are required." });
  }

  try {
    const DAOHandler = new web3.eth.Contract(contractABI, contractAddress);
    const tokenContract = new web3.eth.Contract(
      TokenAPI.abi,
      TokenContractAddress
    );
    const ifExist = await DAOHandler.methods
      .ngoNumberExist(ngoRegisterationNo)
      .call();

    if (!ifExist) {
      return res.status(400).json({
        error: "NGO is Not Registered yet! Cannot vote for it.",
      });
    }

    const balance = await tokenContract.methods.balanceOf(address).call();
    const balanceInEther = web3.utils.fromWei(balance, "ether");

    if (Number(balanceInEther) < 1) {
      return res
        .status(400)
        .json({ error: "Balance must be atleast 1 token or greater." });
    }

    const ifVoted = await DAOHandler.methods
      .ngoVoters(address, ngoRegisterationNo)
      .call();

    if (ifVoted) {
      return res
        .status(400)
        .json({
          error: "You have already voted for the NGO cannot vote Again!.",
        });
    }

    const tx = await DAOHandler.methods
      .voteAgainstNGO(ngoRegisterationNo, address)
      .send({
        from: account.address,
        gas: await web3.eth.estimateGas({
          from: account.address,
          to: contractAddress,
          data: DAOHandler.methods
            .voteAgainstNGO(ngoRegisterationNo, address)
            .encodeABI(),
        }),
      });

    console.log("Transaction Receipt:", tx);

    return res.status(200).json({
      message: "Transaction successful",
      transactionHash: tx.transactionHash,
      RegisterationNo: ngoRegisterationNo,
      Address: address,
      VotedAgainst: true,
    });
  } catch (error) {
    console.error("Transaction Error:", error);
    return res
      .status(500)
      .json({ error: "Transaction failed", details: error.message });
  }
}
