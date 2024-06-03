import Web3 from "web3";
import DAOhandlerApi from "../../../../abi/DAOHandler.json";
import TokenAPI from "../../../../abi/TokenContract.json";

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

    const { ngoRegistrationNo, address } = req.body;

    if (!ngoRegistrationNo || !address) {
      return res
        .status(400)
        .json({ error: "NGO registration number and address are required." });
    }

    const DAOHandler = new web3.eth.Contract(contractABI, contractAddress);
    const tokenContract = new web3.eth.Contract(
      TokenAPI.abi,
      tokenContractAddress
    );

    const ifExist = await DAOHandler.methods
      .ngoNumberExist(ngoRegistrationNo)
      .call();

    if (!ifExist) {
      return res.status(400).json({
        error: "NGO is not registered yet! Cannot vote for it.",
      });
    }

    const balance = await tokenContract.methods.balanceOf(address).call();
    const balanceInEther = web3.utils.fromWei(balance, "ether");

    console.log("Balance before conversion:", balance);

    if (Number(balanceInEther) < 1) {
      return res
        .status(400)
        .json({ error: "Balance must be at least 1 token or greater." });
    }

    const ifVoted = await DAOHandler.methods
      .ngoVoters(address, ngoRegistrationNo)
      .call();

    if (ifVoted) {
      return res
        .status(400)
        .json({ error: "You have already voted for the NGO." });
    }

    const tx = await DAOHandler.methods
      .voteForNGO(ngoRegistrationNo, address)
      .send({
        from: account.address,
        gas: await web3.eth.estimateGas({
          from: account.address,
          to: contractAddress,
          data: DAOHandler.methods
            .voteForNGO(ngoRegistrationNo, address)
            .encodeABI(),
        }),
      });

    console.log("Transaction Receipt:", tx);

    return res.status(200).json({
      message: "Transaction successful",
      transactionHash: tx.transactionHash,
      RegistrationNo: ngoRegistrationNo,
      Address: address,
      VotedInFavor: true,
    });
  } catch (error) {
    console.error("Transaction Error:", error);
    return res
      .status(500)
      .json({ error: "Transaction failed", details: error.message });
  }
}
