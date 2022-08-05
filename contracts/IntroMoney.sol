// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract IntroMoney {
  address private owner;
  uint256 private feePercent;
  using SafeMath for uint256;
  uint256 private minRegisterDeposit;
  uint256 private unreadConversationExpiryDays;

  struct User {
    uint256 id;
    uint256 balance;
    bytes32 username;
    bool exists;
    address payable userAddress;
    bool transferLocked;
  }
  uint256 private userId;
  mapping(address => User) private users;
  address[] private usersList;

  struct ConversationMessage {
    uint256 id;
    address owner;
    bytes text;
    bool exists;
    uint256 createdAt;
  }
  struct Conversation {
    address owner;
    bytes32 ownerUsername;
    address recipient;
    bytes32 recipientUsername;
    uint256 readReward;
    uint256 replyReward;
    bool exists;
    ConversationMessage[] messages;
    uint32 id;
    uint256 messageId;
    bytes32 conversationHash;
    uint256 createdAt;
    bool expired;
  }
  uint32 private conversationId;

  mapping(address => uint32[]) private ownerConversations;
  mapping(address => uint32[]) private recipientConversations;
  mapping(uint32 => Conversation) private conversations;
  mapping(uint32 => address) private paidReads;
  mapping(uint32 => address) private paidReplies;
  mapping(bytes32 => uint32) private conversationsHashToId;

  function createConversation(
    bytes memory _encryptedMessage,
    uint256 _readReward,
    uint256 _replyReward
  ) public returns (bool) {
    require(isRegistered(msg.sender), "You are not registered");

    conversations[conversationId].owner = msg.sender;
    conversations[conversationId].readReward = _readReward;
    conversations[conversationId].replyReward = _replyReward;
    conversations[conversationId].exists = true;
    conversations[conversationId].ownerUsername = users[msg.sender].username;
    conversations[conversationId].createdAt = block.timestamp;
    ConversationMessage memory message =
      ConversationMessage({
        id: conversations[conversationId].messageId,
        owner: msg.sender,
        text: _encryptedMessage,
        exists: true,
        createdAt: block.timestamp
      });
    conversations[conversationId].messages.push(message);
    ownerConversations[msg.sender].push(conversationId);
    conversations[conversationId].messageId++;
    conversations[conversationId].id = conversationId;
    bytes32 conversationHash = keccak256(abi.encode(conversationId));
    conversations[conversationId].conversationHash = conversationHash;
    conversationsHashToId[conversationHash] = conversationId;
    conversationId++;

    // emit CreateConversation(msg.sender, messageId);
    // emit CreateMessage(msg.sender, messageId);

    return true;
  }

  function addMessageToConversation(
    uint32 _conversationId,
    bytes memory _encryptedMessage
  ) public returns (bool) {
    // require(isOwner(msg.sender), "You are not the contract owner");
    require(isRegistered(msg.sender), "You are not registered");
    require(
      conversations[_conversationId].exists == true,
      "Conversation does not exist"
    );
    require(
      conversations[_conversationId].owner == msg.sender ||
        conversations[_conversationId].recipient == msg.sender,
      "Not allowed."
    );
    require(
      conversations[_conversationId].expired == false,
      "Conversation is expired"
    );

    if (
      conversations[_conversationId].recipient == msg.sender &&
      paidReplies[_conversationId] == address(0)
    ) {
      uint256 fee =
        SafeMath.div(
          SafeMath.mul(conversations[_conversationId].replyReward, feePercent),
          100
        );
      require(
        users[conversations[_conversationId].owner].balance >=
          SafeMath.add(conversations[_conversationId].replyReward, fee),
        "Message owner does not afford this"
      );

      users[conversations[_conversationId].owner].balance -= conversations[
        _conversationId
      ]
        .replyReward;
      users[msg.sender].balance += conversations[_conversationId].replyReward;

      // fee
      users[conversations[_conversationId].owner].balance -= fee;
      users[owner].balance += fee;

      paidReplies[_conversationId] = msg.sender;
    }

    ConversationMessage memory message =
      ConversationMessage({
        id: conversations[_conversationId].messageId,
        owner: msg.sender,
        text: _encryptedMessage,
        exists: true,
        createdAt: block.timestamp
      });
    conversations[_conversationId].messages.push(message);
    conversations[_conversationId].messageId++;

    return true;
  }

  function checkConversationReadByParticipant(
    uint32 _conversationId,
    address _participant
  ) public view returns (bool) {
    require(isOwner(msg.sender), "You are not the contract owner");
    require(
      conversations[_conversationId].exists == true,
      "Conversation does not exist"
    );

    return
      conversations[_conversationId].owner == _participant ||
      conversations[_conversationId].recipient == _participant;
  }

  function readConversationByParticipant(
    uint32 _conversationId,
    address _participant
  ) public returns (bool) {
    require(isOwner(msg.sender), "You are not the contract owner");
    require(
      conversations[_conversationId].exists == true,
      "Conversation does not exist"
    );
    require(
      conversations[_conversationId].expired == false,
      "Conversation is expired"
    );
    require(
      conversations[_conversationId].recipient == address(0) ||
        conversations[_conversationId].owner == _participant ||
        conversations[_conversationId].recipient == _participant,
      "Not allowed"
    );

    if (
      conversations[_conversationId].recipient == address(0) &&
      conversations[_conversationId].owner != _participant
    ) {
      if (
        conversations[_conversationId].expired == false &&
        block.timestamp >
        conversations[_conversationId].createdAt +
          unreadConversationExpiryDays *
          1 days
      ) {
        conversations[_conversationId].expired = true;
        revert("Conversation is older than allowed");
      }

      uint256 fee =
        SafeMath.div(
          SafeMath.mul(conversations[_conversationId].readReward, feePercent),
          100
        );
      require(
        users[conversations[_conversationId].owner].balance >=
          SafeMath.add(conversations[_conversationId].readReward, fee),
        "Message owner does not afford this"
      );
      conversations[_conversationId].recipient = _participant;
      conversations[_conversationId].recipientUsername = users[_participant]
        .username;
      users[conversations[_conversationId].owner].balance -= conversations[
        _conversationId
      ]
        .readReward;
      users[_participant].balance += conversations[_conversationId].readReward;

      // fee
      users[conversations[_conversationId].owner].balance -= fee;
      users[owner].balance += fee;

      recipientConversations[_participant].push(_conversationId);
      paidReads[_conversationId] = _participant;
    }

    return true;
  }

  function isOwner(address _owner) public view returns (bool) {
    return owner == _owner;
  }

  function getConversations() public view returns (Conversation[] memory) {
    require(isRegistered(msg.sender));

    Conversation[] memory userConversations =
      new Conversation[](
        ownerConversations[msg.sender].length +
          recipientConversations[msg.sender].length
      );
    uint256 j = 0;

    for (uint256 i = 0; i < recipientConversations[msg.sender].length; i++) {
      userConversations[j++] = conversations[
        recipientConversations[msg.sender][i]
      ];
    }

    for (uint256 i = 0; i < ownerConversations[msg.sender].length; i++) {
      userConversations[j++] = conversations[ownerConversations[msg.sender][i]];
    }

    return userConversations;
  }

  function getConversation(uint32 _conversationId)
    public
    view
    returns (Conversation memory)
  {
    require(isRegistered(msg.sender), "You are not registered");
    require(
      conversations[_conversationId].exists,
      "Conversation doesn't exist"
    );
    require(
      conversations[_conversationId].recipient == address(0) ||
        conversations[_conversationId].recipient == msg.sender ||
        conversations[_conversationId].owner == msg.sender,
      "Not allowed"
    );

    return conversations[_conversationId];
  }

  function getConversationByHash(bytes32 _conversationHash)
    public
    view
    returns (Conversation memory)
  {
    uint32 conversationIdFromHash = conversationsHashToId[_conversationHash];
    require(
      conversations[conversationIdFromHash].exists,
      "Conversation doesn't exist"
    );
    require(
      conversations[conversationIdFromHash].recipient == address(0) ||
        conversations[conversationIdFromHash].recipient == msg.sender ||
        conversations[conversationIdFromHash].owner == msg.sender,
      "Not allowed"
    );

    return conversations[conversationIdFromHash];
  }

  mapping(address => uint256[]) userCreatedMessages;
  mapping(address => uint256[]) userReadMessages;

  event Deposit(address indexed _from, uint256 _value);
  event Withdraw(address indexed _from, uint256 _value);
  event CreateMessage(address indexed _from, uint256 _messageId);
  event Register(address indexed _from);

  constructor(
    uint256 _userId,
    uint32 _conversationId,
    address _owner,
    uint256 _feePercent,
    uint256 _minRegisterDeposit,
    uint256 _unreadConversationExpiryDays
  ) {
    userId = _userId; // should be 1
    owner = _owner;
    conversationId = _conversationId;
    feePercent = _feePercent;
    minRegisterDeposit = _minRegisterDeposit;
    unreadConversationExpiryDays = _unreadConversationExpiryDays;

    users[owner] = User({
      balance: 0 wei,
      username: "Owner",
      id: userId,
      exists: true,
      userAddress: payable(_owner),
      transferLocked: false
    });
    userId++;
  }

  function registerWithDeposit(bytes32 _username)
    public
    payable
    returns (bool)
  {
    require(!isRegistered(msg.sender), "User already registered.");
    require(
      msg.value >= minRegisterDeposit,
      "Register deposit value small then the minimum."
    );

    users[msg.sender] = User({
      balance: msg.value,
      username: _username,
      id: userId,
      exists: true,
      userAddress: payable(msg.sender),
      transferLocked: false
    });
    emit Register(msg.sender);
    userId++;

    return true;
  }

  function register(bytes32 _username) public returns (bool) {
    require(!isRegistered(msg.sender), "User already registered.");

    users[msg.sender] = User({
      balance: 0 wei,
      username: _username,
      id: userId,
      exists: true,
      userAddress: payable(msg.sender),
      transferLocked: false
    });
    emit Register(msg.sender);
    userId++;

    return true;
  }

  function isRegistered(address sender) public view returns (bool) {
    return users[sender].exists;
  }

  function deposit() public payable returns (bool) {
    require(isRegistered(msg.sender));

    users[msg.sender].balance += msg.value;
    emit Deposit(msg.sender, msg.value);

    return true;
  }

  function balance() public view returns (uint256) {
    require(isRegistered(msg.sender));

    return users[msg.sender].balance;
  }

  function username() public view returns (bytes32) {
    require(isRegistered(msg.sender));

    return users[msg.sender].username;
  }

  function transfer(
    address recipientAddress,
    address fromAddress,
    uint256 amount
  ) public returns (bool) {}

  function withdraw(uint256 _amount) public returns (bool) {
    require(isRegistered(msg.sender));
    require(users[msg.sender].balance >= _amount, "Not enough balance");
    require(!users[msg.sender].transferLocked, "Request is locked");

    users[msg.sender].transferLocked = true;
    (bool success, bytes memory transactionBytes) =
      users[msg.sender].userAddress.call{value: _amount}("");

    require(success, "Transfer failed.");

    users[msg.sender].balance -= _amount;
    users[msg.sender].transferLocked = false;
    emit Withdraw(msg.sender, _amount);

    return true;
  }
}
