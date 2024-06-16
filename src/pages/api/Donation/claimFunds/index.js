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

  const { beneficiaryAddress,campaignId, vendorAddress } = req.body;

  if (!beneficiaryAddress || !campaignId || !vendorAddress) {
    return res.status(400).json({
      error:
        "Beneficiary address, campaign ID,and vendor address is required.",
    });
  }

  try {
      const hasVoucher = await DAOHandler.methods
        .beneficiaryHasVoucherInCampaign(beneficiaryAddress, campaignId)
        .call();

        if (parseInt(hasVoucher) < 1) {
          return res.status(400).json({
            error: "the beneficiary does not have >=1 voucher",
          });
        }



    const priceofVoucher = await DAOHandler.methods
      .priceOfVoucher(beneficiaryAddress, campaignId)
      .call();

    if (parseInt(priceofVoucher) < 1) {
      return res.status(400).json({
        error: "Voucher price is low or voucher might not exist.",
      });
    }

    const tx = await DAOHandler.methods
      .claimFundsOfBeneficiary(beneficiaryAddress, campaignId, vendorAddress)
      .send({
        from: account.address,
        gas: await web3.eth.estimateGas({
          from: account.address,
          to: contractAddress,
          data: DAOHandler.methods
            .claimFundsOfBeneficiary(
              beneficiaryAddress,
              campaignId,
              vendorAddress
            )
            .encodeABI(),
        }),
      });

    console.log("Transaction Receipt:", tx);

    return res.status(200).json({
      message: "Transaction successful",
      transactionHash: tx.transactionHash,
      campaignId: campaignId,
      voucherCreated: true,
      BeneficiaryAddress: beneficiaryAddress,
      vendorAddress:vendorAddress
    });
  } catch (error) {
    console.error("Error sending transaction:", error);
    res.status(500).json({ error: "Failed transaction." });
  }
}
