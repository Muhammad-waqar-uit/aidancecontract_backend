// pages/api/ngo/registerNgo.js

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
  const { ngoRegisterationNo } = req.body;

  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (!ngoRegisterationNo) {
    return res
      .status(400)
      .json({ error: "NGO registration number is required." });
  }

  try {
    const DAOHandler = new web3.eth.Contract(contractABI, contractAddress);

    const ifExist = await DAOHandler.methods
      .ngoNumberExist(ngoRegisterationNo)
      .call();
    
    if (!ifExist) {
      return res.status(400).json({
        error: "NGO registration doesnot exist. Cannot confirm it.",
      });
    }

    const ifNgoAccepted = await DAOHandler.methods
          .registeredNGOs(ngoRegisterationNo)
          .call();


    if(ifNgoAccepted){
      return res.status(400).json({
        error:"Ngo is already Accepted!."
      })
    }


    const totalAgainstVote = await DAOHandler.methods
      .againstVotes(ngoRegisterationNo)
      .call();
    const totalInfavorsVote = await DAOHandler.methods
      .infavourVotes(ngoRegisterationNo)
      .call();
    console.log("total against vote", totalAgainstVote, totalInfavorsVote);

    const totalInfavorsVoteNumber = Number(totalInfavorsVote);
    const totalAgainstVoteNumber = Number(totalAgainstVote);
    console.log(
      "total against vote",
      totalInfavorsVoteNumber,
      totalAgainstVoteNumber
    );


      if (totalInfavorsVoteNumber === 0 && totalAgainstVoteNumber === 0) {
        return res.status(400).json({
          error: "Both in favour and against votes are zero.",
          totalInfavorsVoteNumber,
          totalAgainstVoteNumber,
        });
      }


    if (totalInfavorsVoteNumber <= totalAgainstVoteNumber) {
      return res.status(400).json({
        error: "In favour votes must be greater than against votes.",
        totalInfavorsVoteNumber,
        totalAgainstVoteNumber
      });
    }

    const tx = await DAOHandler.methods
      .confirmRegisteration(ngoRegisterationNo)
      .send({
        from: account.address,
        gas: await web3.eth.estimateGas({
          from: account.address,
          to: contractAddress,
          data: DAOHandler.methods
            .confirmRegisteration(ngoRegisterationNo)
            .encodeABI(),
        }),
      });

    console.log("Transaction Receipt:", tx);

    return res.status(200).json({
      message: "Transaction successful",
      transactionHash: tx.transactionHash,
      RegisterationNo: ngoRegisterationNo,
      ConfirmRegistration:true,
    });
  } catch (error) {
    console.error("Transaction Error:", error);
    return res
      .status(500)
      .json({ error: "Transaction failed", details: error.message });
  }
}
