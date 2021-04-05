const CryptoSoccerBall = artifacts.require('./CryptoSoccerBall.sol')

require('chai')
  .use(require('chai-as-promised'))
  .should()

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

contract('CryptoSoccerBall', (accounts) => {
  let contract

  before(async () => {
    contract = await CryptoSoccerBall.deployed();
  })
  describe('deployment', async () => {
    it('deploys successfully', async () => {
      const address = contract.address
      assert.notEqual(address, 0x0)
      assert.notEqual(address, undefined)
    })
    it('has a name', async () => {
      const name = await contract.name()
      assert.equal(name, 'Soccer Ball')
    })
    it('has a symbol', async () => {
      const symbol = await contract.symbol()
      assert.equal(symbol, 'BALL')
    })
  })
  describe('minting', async () => {
    it('creates a new ball', async () => {
      const result = await contract.createSoccerBall({ from: accounts[1] });
      const nbBall = await contract.getNbBall();

      assert.equal(nbBall, 1)
      const event = result.logs[0].args
      assert.equal(event.tokenId.toNumber(), 1, 'bad token id')
      assert.equal(event.from, '0x0000000000000000000000000000000000000000', 'bad from address')
      assert.equal(event.to, accounts[1], 'bad to address')

    })
    it('launch Ball', async () => {
        const result = await contract.safeTransferFrom(accounts[1], accounts[2], 1, { from: accounts[1] })
        // Fail : account[0] do not have token 1 anymore
        await contract.safeTransferFrom(accounts[1], accounts[2], 1, { from: accounts[1] }).should.be.rejected;

        // ball come back
        await contract.safeTransferFrom(accounts[2], accounts[1], 1, { from: accounts[2] })
    })
    it('creator can push Ball', async () => {
        const result = await contract.safeTransferFrom(accounts[1], accounts[2], 1, { from: accounts[1] })
        // ball come back by creator
        await contract.safeTransferFrom(accounts[2], accounts[1], 1, { from: accounts[1] })
    })

    it('referee can push Ball', async () => {
        const result = await contract.safeTransferFrom(accounts[1], accounts[2], 1, { from: accounts[1] })
        // ball come back by referee
        await contract.safeTransferFrom(accounts[2], accounts[1], 1, { from: accounts[0] })
    })

    it('owner can push Ball', async () => {
        const result = await contract.safeTransferFrom(accounts[1], accounts[2], 1, { from: accounts[1] })
        await contract.safeTransferFrom(accounts[2], accounts[3], 1, { from: accounts[2] })
        await contract.safeTransferFrom(accounts[3], accounts[1], 1, { from: accounts[3] })
    })

    it('other account cannot push Ball', async () => {
        const result = await contract.safeTransferFrom(accounts[1], accounts[2], 1, { from: accounts[1] })
        // ball cannot come back by anybody
        await contract.safeTransferFrom(accounts[2], accounts[1], 1, { from: accounts[3] }).should.be.rejected

        // ball come back by referee
        await contract.safeTransferFrom(accounts[2], accounts[1], 1, { from: accounts[0] })
    })

    it('more ball', async () => {
        // 2
        await contract.createSoccerBall({ from: accounts[2] });
        // 3
        await contract.createSoccerBall({ from: accounts[3] });
        // 4
        await contract.createSoccerBall({ from: accounts[4] });

        await contract.safeTransferFrom(accounts[4], accounts[3], 4, { from: accounts[0] })

        const balance0 = await contract.balanceOf(accounts[0], { from: accounts[0] })
        const balance1 = await contract.balanceOf(accounts[1], { from: accounts[0] })
        const balance2 = await contract.balanceOf(accounts[2], { from: accounts[0] })
        const balance3 = await contract.balanceOf(accounts[3], { from: accounts[0] })
        assert.equal(balance0, 0)
        assert.equal(balance1, 1)
        assert.equal(balance2, 1)
        assert.equal(balance3, 2)
  
    })

    it('burn ball', async () => {
        await contract.burn(4, { from: accounts[4] });
        // Fail : ball is burn
        await contract.safeTransferFrom(accounts[3], accounts[1], 4, { from: accounts[3] }).should.be.rejected;
        // Fail : account 1 is not the ball creator
        await contract.burn(3, { from: accounts[1] }).should.be.rejected;
        // Fail : referee can't burn ball
        await contract.burn(3, { from: accounts[0] }).should.be.rejected;
        await contract.burn(3, { from: accounts[3] });
        await contract.burn(2, { from: accounts[2] });
    })

    it('offer a ball', async () => {
      // Fail : account 0 is not master owner
      await contract.offerBall(accounts[2], 1, { from: accounts[0] }).should.be.rejected;
      // Fail : account 3 is not master owner
      await contract.offerBall(accounts[2], 1, { from: accounts[3] }).should.be.rejected;
      await contract.offerBall(accounts[2], 1, { from: accounts[1] });
      await contract.offerBall(accounts[1], 1, { from: accounts[2] });
    })

    it('steal a ball', async () => {
      // Fail : can't steal ball if onwer is the master owner
      await contract.stealBall(1, { from: accounts[1] }).should.be.rejected;

      await contract.safeTransferFrom(accounts[1], accounts[2], 1, { from: accounts[0] })
      // Fail : can't steal ball if last shot is less than 2 hours.
      await contract.stealBall(1, { from: accounts[3] }).should.be.rejected;

      await contract.setMinStealDelay(1, { from: accounts[0] });
      // Fail : can't set minStealDealy if user is not the referee.
      await contract.setMinStealDelay(1, { from: accounts[2] }).should.be.rejected;
      await contract.safeTransferFrom(accounts[2], accounts[5], 1, { from: accounts[0] })
      await sleep(2000);
      await contract.stealBall(1, { from: accounts[4] });
      const ballOwner = await contract.ownerOf(1, { from: accounts[0] });
      assert.equal(ballOwner, accounts[4]);
    })

  })

})
