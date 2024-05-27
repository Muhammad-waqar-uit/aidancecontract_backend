import Web3 from "web3";
import TokenAPI from "../../../abi/TokenContract.json";

const providerURL = process.env.RPC_URL;
const privateKey = process.env.SuperPrivateKey;
const maxFees = process.env.MaxGasFees;
const priorityGasFees = process.env.MaxPriortyGasFees;
const contractAddress = process.env.Vote_Token_Contract;

// Initialize Web3
const web3 = new Web3(new Web3.providers.HttpProvider(providerURL));
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(account);

export default async function handler(req, res) {
  const { address, amount } = req.body;

  if (req.method !== "POST") {
    return res
      .setHeader("Allow", ["POST"])
      .status(405)
      .end(`Method ${req.method} Not Allowed`);
  }

  if (!address || !amount) {
    return res.status(400).json({ error: "Address and amount are required." });
  }

  try {
    const tokenContract = new web3.eth.Contract(TokenAPI.abi, contractAddress);

    const tx = {
      from: account.address,
      to: contractAddress,
      gas: await web3.eth.estimateGas({
        from: account.address,
        to: contractAddress,
        data: tokenContract.methods
          .mint(address,amount)
          .encodeABI(),
      }),
      maxFeePerGas: web3.utils.toWei(maxFees, "gwei"),
      maxPriorityFeePerGas: web3.utils.toWei(priorityGasFees, "gwei"),
      data: tokenContract.methods
        .mint(address,amount)
        .encodeABI(),
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );

    return res
      .status(200)
      .json({
        message: "Transaction successful",
        transactionHash: receipt.transactionHash,
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
