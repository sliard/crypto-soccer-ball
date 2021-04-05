# Crypto Soccer Ball

Crypto Soccer Ball a sample use of NFT token ERC-721 for a game. The token represent a soccer ball that you can create, shot and steal. We have defined 3 roles :
* Referee : Person who create the game
* MasterOwner : Soccer ball Owner
* Holder : Person that hold the soccer ball (token owner)

Rules :
* Anybody can create one and only one soccer ball.
* Only the referee, the masterOwner and the holder of the ball can shoot into a soccer ball to send it to anybody.
* Anybody can steal a soccer ball except if the ball have move less than 2 hours before or if the ball is hold by the referee or by the masterOwner.
* A masterOwner can offer his soccer ball to anybody that is not already a masterOwner of an another ball.

More informations into 2 medium posts (in french)
* [basic](https://sliard.medium.com/jai-achet%C3%A9-un-chat-virtuel-66433db06b53)
* [code sample](https://sliard.medium.com/nft-et-football-e9885a6481d6)

The game connected to Ropsten test network -> [here](https://liard.me/crypto-soccer-ball/).

## requirements

Install [Truffle](https://www.trufflesuite.com/truffle)

    npm install truffle -g

Install [Ganache](https://www.trufflesuite.com/ganache) and run a local blockchain.

Install [Metamask](https://metamask.io/) browser extension, connect extention to local ganache blockchain and import one of the ganache account

## installation

Clone this repo

    git clone git@github.com:sliard/crypto-soccer-ball.git

Compile contracts

    cd crypto-soccer-ball
    npm install
    truffle compile

Deploy contract to Ganache blockchain

    truffle migrate

Run web client

    cd client
    npm install
    npm run start