import { prisma } from "@/utils/db";
import { parseEther } from "viem";
import Web3 from "web3";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { senderAddress, recipientAddress, amountWei } = req.body;
  console.log(senderAddress, recipientAddress, amountWei);
  if (!senderAddress || !recipientAddress || !amountWei) {
    return res.status(400).json({
      error: "Sender address, recipient address, and amount are required.",
    });
  }

  // Initialize Web3
  const providerURL = process.env.RPC_URL;
  const web3 = new Web3(new Web3.providers.HttpProvider(providerURL));

  try {
    // Fetch the sender's private key from the database using Prisma
    const sender = await prisma.address.findUnique({
      where: { publicAddress: senderAddress },
    });

    if (!sender) {
      return res.status(404).json({ error: "Sender address not found." });
    }

    // Check sender's balance
    const senderBalanceWei = await web3.eth.getBalance(senderAddress);
    const senderBalanceWeiString = senderBalanceWei.toString(); // Convert BigInt to string

    const ethamountone = parseEther(amountWei);
    const ethamounttwo = Number(ethamountone);
    // Estimate gas fee
    const gasPrice = await web3.eth.getGasPrice();
    const gasEstimate = await web3.eth.estimateGas({
      from: senderAddress,
      to: recipientAddress,
      value: ethamounttwo,
    });
    const gasEstimateString = gasEstimate.toString(); // Convert BigInt to string
    const gasPriceString = gasPrice.toString(); // Convert BigInt to string

    const totalGasFeeWei = BigInt(gasPrice) * BigInt(gasEstimate);
    const totalGasFeeWeiString = totalGasFeeWei.toString(); // Convert BigInt to string

    if (BigInt(senderBalanceWei) < BigInt(ethamounttwo) + totalGasFeeWei) {
      return res.status(400).json({
        error: "Insufficient balance to cover the transaction and gas fees.",
      });
    }

    // Create and sign the transaction
    const nonce = await web3.eth.getTransactionCount(senderAddress);
    const transaction = {
      from: senderAddress,
      to: recipientAddress,
      value: ethamounttwo,
      gas: gasEstimate,
      gasPrice: gasPrice,
      nonce: nonce,
    };

    const signedTx = await web3.eth.accounts.signTransaction(
      transaction,
      sender.privateKey
    );

    // Send the transaction
    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );
    const receiptHash = receipt.transactionHash;
    // Convert BigInts to strings in the response
    res.status(200).json({
      success: true,
      hash: receiptHash,
      senderBalanceWei: senderBalanceWeiString,
      gasEstimate: gasEstimateString,
      gasPrice: gasPriceString,
      totalGasFeeWei: totalGasFeeWeiString,
    });
  } catch (error) {
    console.error("Error sending transaction:", error);
    res.status(500).json({ error: "Unable to send transaction." });
  }
}
