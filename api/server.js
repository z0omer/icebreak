const express = require("express");
const app = express();
const CryptoJS = require("crypto-js");
var bodyParser = require("body-parser");
const Web3 = require("web3");
const IntroMoney = require("./contracts/IntroMoney.json");
var https = require("https");
require("dotenv").config();

const port = process.env.PORT;
const SECRET1 = process.env.SECRET1;
const SECRET2 = process.env.SECRET2;

const provider = new Web3.providers.HttpProvider(
  process.env.WALLET_PROVIDER_URL_FANTOM_TESTNET
);
const web3 = new Web3(provider);
console.log(
  "process.env.WALLET_PROVIDER_URL=" +
    process.env.WALLET_PROVIDER_URL_FANTOM_TESTNET
);
console.log(
  "process.env.CONTRACT_OWNER_ADDRESS=" +
    process.env.CONTRACT_OWNER_ADDRESS_FANTOM
);
console.log(provider);

const contractOwner = process.env.CONTRACT_OWNER_ADDRESS_FANTOM;

let wallet = web3.eth.accounts.wallet;
wallet.add({
  privateKey: process.env.CONTRACT_OWNER_PRIVATE_KEY_FANTOM,
  address: contractOwner,
});
console.log(wallet);

let networkId = process.env.NETWORK_ID_FANTOM_TESTNET;
// await web3.eth.net.getId().then((value) => {
//   networkId = value;
//   console.log("networkId: " + networkId);
// });
const deployedNetwork = IntroMoney.networks[networkId];
const contract = new web3.eth.Contract(
  IntroMoney.abi,
  deployedNetwork && deployedNetwork.address
);
console.log(deployedNetwork);
console.log(contract);

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// create conversation: IntroMoney.createConversation
// read conversation by participant: IntroMoney.readConversationByParticipant
// add message to conversation by participant (owner or recipient): IntroMoney.addMessageToConversation

app.post("/conversation", (req, res) => {
  console.log(req.body);
  let message = req.body.message;
  let rand = Math.floor(Math.random() * 10);
  if (rand % 2 == 0) {
    message = SECRET2 + message;
  } else {
    message = SECRET1 + message;
  }
  let encryptedMessage = CryptoJS.AES.encrypt(
    message,
    req.body.password
  ).toString();
  console.log(encryptedMessage);
  res.send({ encodedMessage: encryptedMessage });

  // res.send({});
});

app.post("/decrypt", async (req, res) => {
  // res.send('Hello World!');
  console.log(req.body);
  try {
    let decodedMessage = CryptoJS.AES.decrypt(
      req.body.message,
      req.body.password
    );
    decodedMessage = decodedMessage.toString(CryptoJS.enc.Utf8);
    console.log("decodedMessage2: " + decodedMessage);
    console.log();
    console.log();
    if (
      decodedMessage.indexOf(SECRET1) != -1 ||
      decodedMessage.indexOf(SECRET2) != -1
    ) {
      decodedMessage = decodedMessage.replace(SECRET1, "");
      decodedMessage = decodedMessage.replace(SECRET2, "");
      decodedMessage = decodedMessage.replace(/<(.|\n)*?>/g, "");
      await readConversationByParticipant(
        req.body.conversationId,
        req.body.reader
      );
      res.send({ decodedMessage: decodedMessage });
    } else {
      res.send({ decodedMessage: null });
    }
  } catch (error) {
    console.log(error);
    res.send({ decodedMessage: null, error: error });
  }
  // this doesnt have to store anything. just decrypt and decide if to trigger payment to recipient
  // trigger paymebnt with some web3 blockchain method - https://ethereum.stackexchange.com/questions/11281/connecting-to-hosted-web3-provider-from-nodejs-backend

  // try to decrypt message (req.encryptedMessages, req.password from user)
  // if decryption works => trigger payment to user (req.userAddress) and return message
  // else return error
});

readConversationByParticipant = async (conversationId, participant) => {
  let checkIsRead = false;
  await contract.methods
    .checkConversationReadByParticipant(conversationId, participant)
    .call({ from: contractOwner })
    .then((r) => {
      checkIsRead = r;
    });

  let gas;
  if (checkIsRead === false) {
    console.log("Conversation " + conversationId + " not read");
    await contract.methods
      .readConversationByParticipant(conversationId, participant)
      .estimateGas({ from: contractOwner })
      .then((g) => {
        gas = g;
      });
    console.log("gas: " + gas);
    // let gasPrice = "25000000000";
    // gas = 2560702;

    await contract.methods
      .readConversationByParticipant(conversationId, participant)
      .send({ from: contractOwner, gas: gas });
  }
};

app.post("/encrypt", (req, res) => {
  // res.send('Hello World!');
  console.log(req.body);
  try {
    let message = req.body.message;
    message = message.replace(/<(.|\n)*?>/g, "");
    let rand = Math.floor(Math.random() * 10);
    if (rand % 2 == 0) {
      message = SECRET2 + message;
    } else {
      message = SECRET1 + message;
    }
    let encryptedMessage = CryptoJS.AES.encrypt(
      message,
      req.body.password
    ).toString();
    res.send({ encryptedMessage: encryptedMessage });
  } catch (error) {
    console.log(error);
    res.send({ encodedMessage: null });
  }
  // this doesnt have to store anything. just decrypt and decide if to trigger payment to recipient
  // trigger paymebnt with some web3 blockchain method - https://ethereum.stackexchange.com/questions/11281/connecting-to-hosted-web3-provider-from-nodejs-backend

  // try to decrypt message (req.encryptedMessages, req.password from user)
  // if decryption works => trigger payment to user (req.userAddress) and return message
  // else return error
});

app.get("/balance", async (req, res) => {
  let balance = 0;
  await contract.methods
    .balance()
    .call({ from: contractOwner })
    .then((r) => {
      balance = r;
    });

  res.send({ balance: web3.utils.fromWei(balance) });
});

const BNB_RATE_REFRESH_RATE = 300;
let bnbRate = {
  createdAt: Date.now() - BNB_RATE_REFRESH_RATE * 1000 - 1000,
  rate: 1.2,
};
app.get("/rate", async (req, res) => {
  if (bnbRate.createdAt < Date.now() - BNB_RATE_REFRESH_RATE * 1000) {
    const options = {
      hostname: "api3.binance.com",
      path: "/api/v3/avgPrice?symbol=FTMUSDT",
      headers: {
        "binance-api-key": process.env.BINANCE_API_KEY,
        "binance-api-key": process.env.BINANCE_API_SECRET,
      },
    };
    await https
      .get(options, (res) => {
        let data = [];
        res.on("data", (chunk) => {
          data.push(chunk);
        });
        res.on("end", () => {
          rate = JSON.parse(Buffer.concat(data).toString());
          bnbRate.rate = rate.price;
          bnbRate.createdAt = Date.now();
        });
      })
      .on("error", (err) => {
        console.log("Error: ", err.message);
      });
  }

  res.send({ rate: bnbRate.rate });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
