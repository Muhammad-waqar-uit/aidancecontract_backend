// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { ethers,Wallet } from "ethers";
export default function handler(req, res) {
  let words = process.env.SeedPhrase;
  let path = "m/44'/60'/0'/0/1";
  
  let mainAccount=ethers.Wallet.fromMnemonic(words,path);
  res.status(200).json({ Address: `${mainAccount.address}`});
}
