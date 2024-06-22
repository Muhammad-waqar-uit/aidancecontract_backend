import Web3 from "web3";
import DAOhandlerApi from "../../../../abi/DAOHandler.json";
import moment from "moment-timezone";

const providerURL = process.env.RPC_URL;
const contractAddress = process.env.DAO_Token_Contract;

// Initialize Web3
const web3 = new Web3(new Web3.providers.HttpProvider(providerURL));
const DAOHandler = new web3.eth.Contract(DAOhandlerApi.abi, contractAddress);

export default async function handler(req, res) {
  const { campaignId } = req.query;

  if (req.method !== "GET") {
    return res
      .setHeader("Allow", ["GET"])
      .status(405)
      .end(`Method ${req.method} Not Allowed`);
  }

  if (!campaignId) {
    return res
      .status(400)
      .json({ error: "Campaign Id is required." });
  }

  try {
    const tokenIds = await DAOHandler.methods._tokenIds().call();

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
      .isVotingPeriodEnded(campaignIdNumber)
      .call();

    const ifAccepted = await DAOHandler.methods
      .acceptedCampaigns(campaignId)
      .call();

    const maxDonation = await DAOHandler.methods
      .maxCampaignDonation(campaignId)
      .call();

    const maxDonationInEth = web3.utils.fromWei(
      maxDonation.toString(),
      "ether"
    );

    const totalBeneficiary = await DAOHandler.methods
      .ngototalBeneficiary(campaignId)
      .call();

    const maxDonationRecived = await DAOHandler.methods
      .recieved_Donation(campaignId)
      .call();
    const maxDonationInEthRecived = web3.utils.fromWei(
      maxDonationRecived.toString(),
      "ether"
    );
    const totalInfavorsVote = await DAOHandler.methods
          .campaignFavourVotes(campaignId)
          .call();
    
          

     const endTime = await DAOHandler.methods.campaignEndTime(campaignId).call();

     // Convert BigInt to a regular number for further processing
     const endTimeNumber = Number(endTime);

     const endDate = moment.unix(endTimeNumber).utcOffset(5 * 60);

     // Format the date
     const formattedDate = endDate.format("YYYY-MM-DD HH:mm:ss.SS");


      const totalAgainstVote = await DAOHandler.methods
        .campaignAgainstVotes(campaignId)
        .call();
    return res.status(200).json({
      campaignId: campaignIdNumber,
      CampaignAcceptedOrNot: ifAccepted,
      TimeEnded: ifTimeEnded,
      MaxCampaignDonation_Total: `${maxDonationInEth.toString()}`,
      Total_Beneficiary: totalBeneficiary.toString(),
      MaxRecievedDonation_Total: `${maxDonationInEthRecived.toString()}`,
      TotalInFavorVoteCampaign: totalInfavorsVote.toString(),
      endTime: formattedDate,
      TotalAgainstVoteCampaign: totalAgainstVote.toString(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
