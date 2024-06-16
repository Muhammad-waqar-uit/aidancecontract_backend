import Web3 from "web3";
import DAOhandlerApi from "../../../../abi/DAOHandler.json";

const providerURL = process.env.RPC_URL;
const contractAddress = process.env.DAO_Token_Contract;
const privateKey = process.env.SuperPrivateKey;
// Initialize Web3
const web3 = new Web3(new Web3.providers.HttpProvider(providerURL));
const DAOHandler = new web3.eth.Contract(DAOhandlerApi.abi, contractAddress);

const account = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(account);
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { beneficiaryAddress, price,campaignId, tokenUri } = req.body;

  if (!beneficiaryAddress || !price || !campaignId || !tokenUri) {
    return res.status(400).json({
      error:
        "Beneficiary address, campaign ID, price ,and tokenUri are required.",
    });
  }

  try {
    const claimedFunds = await DAOHandler.methods
      .claimedFunds(campaignId)
      .call();
    const maxCampaignDonation = await DAOHandler.methods
      .maxCampaignDonation(campaignId)
      .call();

    // Perform the check
    if (
      parseInt(claimedFunds) + parseInt(price) >
      parseInt(maxCampaignDonation)
    ) {
      return res.status(400).json({
        error:
          "Claimed funds plus voucher price exceed maximum donation for this campaign.",
      });
    }

    const receivedDonations = await DAOHandler.methods
      .recieved_Donation(campaignId)
      .call();
      
    // Perform the check
    if (parseInt(receivedDonations) < parseInt(maxCampaignDonation)) {
      return res.status(400).json({
        error: "Campaign has not reached its donation goal.",
      });
    }


  const hasVoucher = await DAOHandler.methods
    .beneficiaryHasVoucherInCampaign(beneficiaryAddress, campaignId)
    .call();

  if (parseInt(hasVoucher) >= 1) {
        return res.status(400).json({
          error: "You already have a voucher for this campaign.",
        });
  }



   const tx = await DAOHandler.methods
     .createVoucher(beneficiaryAddress, price, tokenUri, campaignId)
     .send({
       from: account.address,
       gas: await web3.eth.estimateGas({
         from: account.address,
         to: contractAddress,
         data: DAOHandler.methods
           .createVoucher(beneficiaryAddress, price, tokenUri, campaignId)
           .encodeABI(),
       }),
     });

   console.log("Transaction Receipt:", tx);

   return res.status(200).json({
     message: "Transaction successful",
     transactionHash: tx.transactionHash,
     campaignId: campaignId,
     voucherCreated: true,
     Price: price,
     url: tokenUri,
     BeneficiaryAddress: beneficiaryAddress,
   });
  } catch (error) {
    console.error("Error sending transaction:", error);
    res.status(500).json({ error: "Failed transaction." });
  }
}
