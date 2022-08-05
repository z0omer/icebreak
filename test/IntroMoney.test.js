const IntroMoney = artifacts.require("IntroMoney");
const Web3 = require("web3");

require("chai").use(require("chai-as-promised")).should();

contract("IntroMoney", (accounts) => {
  let introMoney;

  before(async () => {
    introMoney = await IntroMoney.deployed(
      1,
      1,
      accounts[3],
      5,
      "10000000000000000",
      0
    );
    assert(introMoney.address !== "");
  });

  it("allows user to create a conversation", async () => {
    let username = "test";
    await introMoney.registerWithDeposit(Web3.utils.asciiToHex(username), {
      from: accounts[0],
      value: web3.utils.toWei("1"),
    });

    const encryptedMessage = "message text 3";
    const readReward = "0.1";
    const replyReward = "0.2";
    await introMoney.createConversation(
      Web3.utils.asciiToHex(encryptedMessage),
      web3.utils.toWei(readReward),
      web3.utils.toWei(replyReward),
      { from: accounts[0] }
    );
    const conversations = await introMoney.getConversations({
      from: accounts[0],
    });
    assert.equal(
      conversations.length,
      1,
      "return of number of conversations is not 1"
    );
  });

  it("allows user to create a conversation without registering with a deposit", async () => {
    let username = "test";
    await introMoney.register(Web3.utils.asciiToHex(username), {
      from: accounts[5],
    });

    const encryptedMessage = "message text 3";
    const readReward = "0.1";
    const replyReward = "0.2";
    await introMoney.createConversation(
      Web3.utils.asciiToHex(encryptedMessage),
      web3.utils.toWei(readReward),
      web3.utils.toWei(replyReward),
      { from: accounts[5] }
    );
    const conversations = await introMoney.getConversations({
      from: accounts[5],
    });
    assert.equal(
      conversations.length,
      1,
      "return of number of conversations is not 1"
    );
  });

  it("allows user to add a message to a conversation", async () => {
    let username = "test";
    await introMoney.registerWithDeposit(Web3.utils.asciiToHex(username), {
      from: accounts[1],
      value: web3.utils.toWei("1"),
    });

    const encryptedMessage = "message text 3";
    const readReward = "0.1";
    const replyReward = "0.2";
    await introMoney.createConversation(
      Web3.utils.asciiToHex(encryptedMessage),
      web3.utils.toWei(readReward),
      web3.utils.toWei(replyReward),
      { from: accounts[1] }
    );
    let conversations = await introMoney.getConversations({
      from: accounts[1],
    });
    assert.equal(
      conversations.length,
      1,
      "return of number of conversations is not 1"
    );
    await introMoney.addMessageToConversation(
      Web3.utils.numberToHex(conversations[0].id),
      Web3.utils.asciiToHex(encryptedMessage),
      { from: accounts[1] }
    );
    conversations = await introMoney.getConversations({
      from: accounts[1],
    });
    assert.equal(
      conversations[0].messages.length,
      2,
      "return of number of messages in conversation is not 2"
    );
  });

  it("throws an error when the conversation is expired", async () => {
    let introMoneyInstance = await IntroMoney.new(
      1,
      1,
      accounts[3],
      5,
      "10000000000000000",
      0
    );
    assert(introMoneyInstance.address !== "");

    let username = "test";
    await introMoneyInstance.registerWithDeposit(
      Web3.utils.asciiToHex(username),
      {
        from: accounts[0],
        value: web3.utils.toWei("1"),
      }
    );

    const encryptedMessage = "message text 3";
    const readReward = "0.1";
    const replyReward = "0.2";
    await introMoneyInstance.createConversation(
      Web3.utils.asciiToHex(encryptedMessage),
      web3.utils.toWei(readReward),
      web3.utils.toWei(replyReward),
      { from: accounts[0] }
    );
    const conversations = await introMoneyInstance.getConversations({
      from: accounts[0],
    });
    assert.equal(
      conversations.length,
      1,
      "return of number of conversations is not 1"
    );

    let username2 = "test2";
    await introMoneyInstance.registerWithDeposit(
      Web3.utils.asciiToHex(username2),
      {
        from: accounts[1],
        value: web3.utils.toWei("0.01"),
      }
    );

    const sleep = (milliseconds) => {
      return new Promise((resolve) => setTimeout(resolve, milliseconds));
    };
    await sleep(1000);
    let res = await introMoneyInstance
      .readConversationByParticipant(1, accounts[1], {
        from: accounts[3],
      })
      .should.be.rejectedWith("Conversation is older than allowed");
  });

  it("allows user to deposit", async () => {
    let username = "test";
    await introMoney.registerWithDeposit(Web3.utils.asciiToHex(username), {
      from: accounts[2],
      value: web3.utils.toWei("1"),
    });
    await introMoney.deposit({
      from: accounts[2],
      value: web3.utils.toWei("1"),
    });
    const balance = await introMoney.balance({ from: accounts[2] });
    assert.equal(balance, web3.utils.toWei("2"), "balance is wrong");
  });

  it("allows user to withdraw", async () => {
    let username = "test";
    await introMoney.registerWithDeposit(Web3.utils.asciiToHex(username), {
      from: accounts[4],
      value: web3.utils.toWei("1"),
    });
    await introMoney.withdraw(web3.utils.toWei("1"), {
      from: accounts[4],
    });
    const balance = await introMoney.balance({ from: accounts[4] });
    assert.equal(balance, web3.utils.toWei("0"), "balance is wrong");
  });

  it("allows user to get paid for reading and replying to a conversation", async () => {
    let introMoneyInstance = await IntroMoney.new(
      1,
      1,
      accounts[0],
      5,
      "10000000000000000",
      1
    );
    assert(introMoneyInstance.address !== "");

    let username1 = "test1";
    await introMoneyInstance.registerWithDeposit(
      Web3.utils.asciiToHex(username1),
      {
        from: accounts[1],
        value: web3.utils.toWei("1"),
      }
    );

    const encryptedMessage = "message text 3";
    const readReward = "0.1";
    const replyReward = "0.2";
    await introMoneyInstance.createConversation(
      Web3.utils.asciiToHex(encryptedMessage),
      web3.utils.toWei(readReward),
      web3.utils.toWei(replyReward),
      { from: accounts[1] }
    );

    let username2 = "test2";
    await introMoneyInstance.registerWithDeposit(
      Web3.utils.asciiToHex(username2),
      {
        from: accounts[2],
        value: web3.utils.toWei("1"),
      }
    );

    await introMoneyInstance.readConversationByParticipant(1, accounts[2], {
      from: accounts[0],
    });
    let balanceRecipient = await introMoneyInstance.balance({
      from: accounts[2],
    });
    assert.equal(
      balanceRecipient,
      web3.utils.toWei("1.1"),
      "recipient balance is wrong after reading"
    );

    let balanceOwner = await introMoneyInstance.balance({
      from: accounts[1],
    });
    assert.equal(
      balanceOwner,
      web3.utils.toWei("0.895"),
      "conversation owner balance is wrong after reading"
    );

    let balanceContractOwner = await introMoneyInstance.balance({
      from: accounts[0],
    });
    assert.equal(
      balanceContractOwner,
      web3.utils.toWei("0.005"),
      "contract owner balance is wrong after reading"
    );

    await introMoneyInstance.addMessageToConversation(
      Web3.utils.numberToHex(1),
      Web3.utils.asciiToHex("some message"),
      { from: accounts[2] }
    );
    balanceRecipient = await introMoneyInstance.balance({ from: accounts[2] });
    assert.equal(
      balanceRecipient,
      web3.utils.toWei("1.3"),
      "recipient balance is wrong after replying"
    );

    balanceOwner = await introMoneyInstance.balance({
      from: accounts[1],
    });
    assert.equal(
      balanceOwner,
      web3.utils.toWei("0.685"),
      "conversation owner balance is wrong after replying"
    );

    balanceContractOwner = await introMoneyInstance.balance({
      from: accounts[0],
    });
    assert.equal(
      balanceContractOwner,
      web3.utils.toWei("0.015"),
      "contract owner balance is wrong after replying"
    );
  });
});
