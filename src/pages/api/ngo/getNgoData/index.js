import Web3 from "web3";
import DAOhandlerApi from "../../../../abi/DAOHandler.json";

const providerURL = process.env.RPC_URL;
const contractAddress = process.env.DAO_Token_Contract;

// Initialize Web3
const web3 = new Web3(new Web3.providers.HttpProvider(providerURL));
const DAOHandler = new web3.eth.Contract(DAOhandlerApi.abi, contractAddress);

export default async function handler(req, res) {
  const { ngoRegNo } = req.query;

  if (req.method !== "GET") {
    return res
      .setHeader("Allow", ["GET"])
      .status(405)
      .end(`Method ${req.method} Not Allowed`);
  }

  if (!ngoRegNo) {
    return res.status(400).json({ error: "Registeration No is required." });
  }

  try {
    const ifExist = await DAOHandler.methods
      .registeredNGOs(ngoRegNo)
      .call();

    const totalAgainstVote = await DAOHandler.methods
      .againstVotes(ngoRegNo)
      .call();

    const totalInfavorsVote = await DAOHandler.methods
          .infavourVotes(ngoRegNo)
          .call();
     const ifExistngo = await DAOHandler.methods
       .ngoNumberExist(ngoRegNo)
       .call();
    return res.status(200).json({
      ifngoExist:ifExistngo,
      ngoAccepted: ifExist,
      TotalAgainstVote: totalAgainstVote.toString(),
      TotalInFavorVote: totalInfavorsVote.toString(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
