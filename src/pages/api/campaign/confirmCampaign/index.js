import Web3, { errors } from "web3";
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

  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  if (!campaignId) {
    return res.status(400).json({ error: "Campaign id is required." });
  }

  try {
    const DAOHandler = new web3.eth.Contract(contractABI, contractAddress);
    const tokenIds = await DAOHandler.methods._tokenIds().call();

    console.log("tokendIds", tokenIds.toString());
    console.log("number tokenid", typeof Number(tokenIds.toString()));

    console.log("number", Number(tokenIds.toString()) <= Number(campaignId));

    const tokenIdsNumber = Number(tokenIds.toString());
    const campaignIdNumber = Number(campaignId);

    console.log("Token IDs:", tokenIdsNumber);
    console.log("Campaign ID:", campaignIdNumber);

    if (tokenIdsNumber <= 0) {
          return res.status(400).json({ error: "No campaigns exist." });
    }

    if (campaignIdNumber <= 0 || campaignIdNumber > tokenIdsNumber) {
          return res.status(400).json({ error: "Campaign ID does not exist." });
    }

    const ifTimeEnded = await DAOHandler.methods
      .isVotingPeriodEnded(campaignId)
      .call();

    if (!ifTimeEnded){
       return res.status(400).json({
         error: " Voting time not Ended",
       });
    }

 const totalAgainstVote = await DAOHandler.methods
   .campaignAgainstVotes(campaignId)
   .call();
 const totalInfavorsVote = await DAOHandler.methods
   .campaignFavourVotes(campaignId)
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
          totalAgainstVoteNumber,
        });
      }
      const ifAccepted = await DAOHandler.methods
        .acceptedCampaigns(campaignId)
        .call();

    if(ifAccepted){
      return res.status(400).json({
        error:"Campaign Already Accepted."
      })
    }

  const tx = await DAOHandler.methods.confirmAcceptCampaign(campaignId).send({
    from: account.address,
    gas: await web3.eth.estimateGas({
      from: account.address,
      to: contractAddress,
      data: DAOHandler.methods
        .confirmAcceptCampaign(campaignId)
        .encodeABI(),
    }),
  });

  console.log("Transaction Receipt:", tx);

  return res.status(200).json({
    message: "Transaction successful",
    transactionHash: tx.transactionHash,
    campaignId: campaignId,
    ConfirmCampaign: true,
  });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "An error occurred while confirming the campaign.",
    });
  }
}
