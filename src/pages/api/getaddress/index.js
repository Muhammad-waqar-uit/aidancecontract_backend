// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { ethers } from "ethers";
import { prisma } from "@/utils/db";

export default async function handler(req, res) {
  try {
    const words = process.env.SeedPhrase;
    let lengthofAddresses=await prisma.address.count()+1;

    const path = `m/44'/60'/0'/0/${lengthofAddresses}`;

    const mainAccount = ethers.Wallet.fromMnemonic(words, path);

    const response = await prisma.address.create({
      data: {
        publicAddress: mainAccount.address,
        privateKey: mainAccount.privateKey,
      },
    });
    console.log(
      "Wallet created:",
      mainAccount.address,
      mainAccount.privateKey,
      response
    );
    // console.log("count of address",lengthofAddresses)
    // Return the created wallet as a JSON response
    res.status(200).json({ Address: mainAccount.address });
  } catch (error) {
    console.error(error);
    if (
      error.code === "P2002" &&
      error.meta.target === "Address_publicAddress_key"
    ) {
      // Unique constraint failed
      res.status(409).json({ error: "Public address already exists" });
    } else {
      // General error handler
      res.status(500).json({ error: error.message });
    }
  }
}
