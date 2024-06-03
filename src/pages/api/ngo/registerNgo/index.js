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


    const ifExist = await DAOHandler.methods
      .ngoNumberExist(ngoRegisterationNo)
      .call();
    const ifAddressExist = await DAOHandler.methods
      .ngoRegistrationNo(address)
      .call();

    console.log("if Exist", ifExist);
    console.log("ifAddressExist", ifAddressExist);
    // Convert ifAddressExist from BigInt to Number for comparison
    const ifAddressExistAsNumber = Number(ifAddressExist);

    console.log("ifAddress Exist as number",ifAddressExistAsNumber);
    const ngoExist = ifExist || ifAddressExistAsNumber !== 0; // Adjust comparison
    console.log("check one ", ngoExist);
    if (ngoExist) {
      return res.status(400).json({
        error: "NGO registration number or address already exists.",
      });
    }

    const tx = await DAOHandler.methods
      .registerationForNGO(ngoRegisterationNo, address)
      .send({
        from: account.address,
        gas: await web3.eth.estimateGas({
          from: account.address,
          to: contractAddress,
          data: DAOHandler.methods
            .registerationForNGO(ngoRegisterationNo, address)
            .encodeABI(),
        }),
      });

    console.log("Transaction Receipt:", tx);

    return res.status(200).json({
      message: "Transaction successful",
      transactionHash: tx.transactionHash,
      RegisterationNo: ngoRegisterationNo,
      Address: address,
    });
  } catch (error) {
    console.error("Transaction Error:", error);
    return res
      .status(500)
      .json({ error: "Transaction failed", details: error.message });
  }
}
