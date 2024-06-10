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

    const { campaignId, address } = req.body;

    if (!campaignId || !address) {
      return res
        .status(400)
        .json({ error: "Campaign id and address are required." });
    }

    const DAOHandler = new web3.eth.Contract(contractABI, contractAddress);
    const tokenContract = new web3.eth.Contract(
      TokenAPI.abi,
      tokenContractAddress
    );

    const tokenIds = await DAOHandler.methods._tokenIds().call();

    //  console.log("tokendIds",tokenIds.toString())
    //  console.log("number tokenid",typeof Number(tokenIds.toString()))

    //  console.log("number", Number(tokenIds.toString()) <= Number(campaignId));
    if (!(Number(tokenIds.toString()) <= Number(campaignId))) {
      return res.status(400).json({
        error: " campaign ID might not exist.",
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
      .campaignvoters(address, campaignId)
      .call();

    console.log("vote true", ifVoted, typeof ifVoted);
    if (ifVoted) {
      return res
        .status(400)
        .json({ error: "You have already voted for the campaign." });
    }

    const contract = new web3.eth.Contract(contractABI, contractAddress);
    const endTime = await contract.methods.campaignEndTime(campaignId).call();

    // Convert BigInt to a regular number for further processing
    const endTimeNumber = Number(endTime);

    const endDate = moment.unix(endTimeNumber).utcOffset(5 * 60);

    // Format the date
    const formattedDate = endDate.format("YYYY-MM-DD HH:mm:ss.SS");

    console.log("date", formattedDate);

    // Add this snippet to check current time against campaign end time
    const currentTime = moment().utcOffset(5 * 60);

    console.log("current time", currentTime);
    if (currentTime.isAfter(endDate)) {
      return res.status(400).json({
        error: "Cannot vote, the campaign has ended.",
      });
    }
    const tx = await DAOHandler.methods
      .voteAgainstCampaign(campaignId, address)
      .send({
        from: account.address,
        gas: await web3.eth.estimateGas({
          from: account.address,
          to: contractAddress,
          data: DAOHandler.methods
            .voteAgainstCampaign(campaignId, address)
            .encodeABI(),
        }),
      });

    console.log("Transaction Receipt:", tx);

    return res.status(200).json({
      message: "Transaction successful",
      transactionHash: tx.transactionHash,
      CampaignId: campaignId,
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
