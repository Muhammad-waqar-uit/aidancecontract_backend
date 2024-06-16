import Web3 from "web3";
import DAOhandlerApi from "../../../../abi/DAOHandler.json";
import TokenAPI from "../../../../abi/TokenContract.json";
import moment from "moment-timezone";

// Environment variables
const providerURL = process.env.RPC_URL;
const privateKey = process.env.SuperPrivateKey;
const contractAddress = process.env.DAO_Token_Contract;
const tokenContractAddress = process.env.Vote_Token_Contract;

// ABI
const contractABI = DAOhandlerApi.abi;

// Initialize Web3
const web3 = new Web3(new Web3.providers.HttpProvider(providerURL));
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(account);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }

    const { campaignId, updateBeneficiaryno,ngoRegNo } = req.body;

    if (!campaignId || !ngoRegNo || !updateBeneficiaryno) {
      return res
        .status(400)
        .json({ error: "Campaign id, updateBeneficiaryno, and ngoRegNo are required." });
    }

    const DAOHandler = new web3.eth.Contract(contractABI, contractAddress);

    const tokenIds = await DAOHandler.methods._tokenIds().call();

    if (!(Number(tokenIds.toString()) <= Number(campaignId))) {
      return res.status(400).json({
        error: " campaign ID might not exist.",
      });
    }

    const ifExist = await DAOHandler.methods.ngoNumberExist(ngoRegNo).call();

    if (!ifExist) {
          return res.status(400).json({error: "NGO registration doesnot exist.",
      });
    }
    
    const tx = await DAOHandler.methods
      .updateTotalBeneficary(campaignId, updateBeneficiaryno, ngoRegNo)
      .send({
        from: account.address,
        gas: await web3.eth.estimateGas({
          from: account.address,
          to: contractAddress,
          data: DAOHandler.methods
            .updateTotalBeneficary(campaignId, updateBeneficiaryno, ngoRegNo)
            .encodeABI(),
        }),
      });

    console.log("Transaction Receipt:", tx);

    return res.status(200).json({
      message: "Transaction successful",
      transactionHash: tx.transactionHash,
      CampaignId: campaignId,
      UpdatedTotal: updateBeneficiaryno,
      ngoRegNo: ngoRegNo,
      UpdatedInfo:true,
    });
  } catch (error) {
    console.error("Transaction Error:", error);
    return res
      .status(500)
      .json({ error: "Transaction failed", details: error.message });
  }
}
