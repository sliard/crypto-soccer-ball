import React, { Component } from "react";
import CryptoSoccerBall from "./contracts/CryptoSoccerBall.json";
import getWeb3 from "./getWeb3";

import "./App.css";

class App extends Component {
  state = { storageValue: 0, web3: null, accounts: null, contract: null };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();
      web3.eth.defaultAccount = web3.eth.accounts[0];

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = CryptoSoccerBall.networks[networkId];
      const instance = new web3.eth.Contract(
        CryptoSoccerBall.abi,
        deployedNetwork && deployedNetwork.address,
      );

      const myApp = this;
      const selectedAccount = accounts[0];

      instance.events.Transfer({
        filter: {to: selectedAccount},
        fromBlock: 0
      }, function(error, event){ console.log("Transfer event !", event); })
        .on("connected", function(subscriptionId){
          console.log("event connected ", subscriptionId);
        })
        .on('data', function(event){
          instance.methods.tokensOfOwner(selectedAccount).call({ from: selectedAccount }).then(result => {
            myApp.setState({ allTokenOwn: result });
          });
        });
      instance.events.Transfer({
        filter: {from:selectedAccount},
        fromBlock: 0
      }, function(error, event){ console.log("Transfer event !", event); })
        .on("connected", function(subscriptionId){
          console.log("event connected ", subscriptionId);
        })
        .on('data', function(event){
          instance.methods.tokensOfOwner(selectedAccount).call({ from: selectedAccount }).then(result => {
            myApp.setState({ allTokenOwn: result });
          });
        });
  

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, selectedAccount, contract: instance }, this.initData);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Install MetaMask extension.`,
      );
      console.error(error);
    }
  };

  initData = async () => {
    const { selectedAccount, contract } = this.state;

    // Get my ball id if I'm a master owner.
    const ballId = await contract.methods.getMasterOwnerBallOf(selectedAccount).call({ from: selectedAccount });
    console.log("master ball ID : ", ballId);
    
    const canCreateBall = (ballId == 0) || await contract.methods.canCreateBall(selectedAccount).call({ from: selectedAccount });
    console.log("canCreateBall : ", canCreateBall);

    contract.methods.canCreateBall(selectedAccount).call({ from: selectedAccount }).then(result => {console.log("canCreateBall then", result)}).catch((err) => {
      alert(err.message);
    });

    const referee = await contract.methods.getReferee().call({ from: selectedAccount });
    console.log("referee : ", referee);

    const allTokenOwn = await contract.methods.tokensOfOwner(selectedAccount).call({ from: selectedAccount });
    console.log("allTokenOwn : ", allTokenOwn);

    if (ballId > 0) {
      const ownerOf = await contract.methods.ownerOf(ballId).call({ from: selectedAccount });
      console.log("ownerOf : ", ownerOf);
  
      const masterOwnerOf = await contract.methods.masterOwnerOf(ballId).call({ from: selectedAccount });
      console.log("masterOwnerOf : ", masterOwnerOf);
  
    }
    

    /*
    // Get the value from the contract to prove it worked.
    const response = await contract.methods.get().call();
*/
    // Update state with the result.
    this.setState({ ballId: ballId, canCreateBall: canCreateBall, referee: referee, allTokenOwn: allTokenOwn });
  };

  mint = () => {
    this.state.contract.methods.createSoccerBall().send({ from: this.state.selectedAccount }).then((result) => {
      this.state.contract.methods.getMasterOwnerBallOf(this.state.selectedAccount).call({ from: this.state.selectedAccount }).then( ballId => this.setState({ ballId: ballId}));
      this.setState({ canCreateBall: false});
    }).catch((err) => {
      alert(err.message);
    });
  }


  offer = async (dest) => {
    const { selectedAccount, contract } = this.state;
    
    const ballId = await contract.methods.getMasterOwnerBallOf(dest).call({ from: selectedAccount });
    if(ballId > 0) {
      alert("User is already the masterOwner of soccer ball : " + ballId);
      return;
    }

    contract.methods.offerBall(dest, this.state.ballId).send({ from: selectedAccount }).then((result) => {
      this.setState({ ballId: 0});
      console.log("offer Ok");
    }).catch((err) => {
      alert(err.message);
    });
  }

  burn = async (ballId) => {
    const { selectedAccount, contract } = this.state;

    const tokenExists = await contract.methods.exists(ballId).call({ from: selectedAccount });
    if(!tokenExists) {
      alert("Ball " + ballId + " don't exist");
      return;
    }

    const masterOwnerOf = await contract.methods.masterOwnerOf(ballId).call({ from: selectedAccount });
    console.log("masterOwnerOf : " + masterOwnerOf);
    if (masterOwnerOf != this.state.selectedAccount) {
      alert("Your ar not the master owner of ball : " + ballId);
      return;
    }

    this.state.contract.methods.burn(this.state.ballId).send({ from: this.state.selectedAccount }).then((result) => {
      this.setState({ ballId: 0});
      console.log("offer Ok");
    }).catch((err) => {
      alert(err.message);
    });
  }

  steal = async (stealId) => {
    const { selectedAccount, contract } = this.state;

    const tokenExists = await contract.methods.exists(stealId).call({ from: selectedAccount });
    if(!tokenExists) {
      alert("Ball " + stealId + " don't exist");
      return;
    }
    
    const minStealDelay = await contract.methods.getMinStealDelay().call({ from: selectedAccount });
    console.log("minStealDelay : " + minStealDelay);

    const lastShoot = await contract.methods.getLastShootOf(stealId).call({ from: selectedAccount });
    console.log("lastShoot : " + lastShoot);

    const stealAfter = await contract.methods.stealAfter(stealId).call({ from: selectedAccount });
    console.log("stealAfter : " + stealAfter);

    const timeNow = (new Date()).getTime()/1000;

    if(stealAfter == 0) {
      alert("Ball " + stealId + " can't be stolen at all");
      return;
    }
    if(timeNow - stealAfter < 0) {
      var d = new Date();
      d.setTime(stealAfter*1000);
      alert("Ball " + stealId + " can't be stolen before : " + d.toDateString() + " - " + d.toLocaleTimeString());
      return;
    }
    console.log("stealAfter : " + stealAfter);

    contract.methods.stealBall(stealId).send({ from: selectedAccount }).then((result) => {
      console.log("steal Ok");
      contract.methods.tokensOfOwner(selectedAccount).call({ from: selectedAccount }).then((result) => {
        this.setState({ allTokenOwn: result });
      });
    }).catch((err) => {
      alert(err.message);
    });


  }

  shoot = (to, ballId) => {
    const { selectedAccount, contract } = this.state;

    contract.methods.shootTo(to, ballId).send({ from: selectedAccount }).then((result) => {
      console.log("shoot Ok");
      contract.methods.tokensOfOwner(selectedAccount).call({ from: selectedAccount }).then((result) => {
        this.setState({ allTokenOwn: result });
      });
    }).catch((err) => {
      alert(err.message);
    });
  }


  render() {

    const soccerball = {
      margin: '10px',
      'maxWidth': '150px',
    };

    const midbutton = {
      margin: 'auto',
      'maxWidth': '150px',
    };

    const midTextInput = {
      margin: 'auto',
      'maxWidth': '450px',
    };


    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract... Install MetaMask extension !</div>;
    }
    return (
      <div>
          <nav className="navbar navbar-expand-md navbar-dark fixed-top bg-dark p-0">
            <div className="container-fluid">
              <div className="navbar-brand">Crypto Soccer Ball</div>
              <ul className="navbar-nav px-3">
                <li className="nav-item text-nowrap d-none d-sm-none d-sm-block">
                  <small className="text-white"><span id="account">{this.state.selectedAccount}</span></small>
                </li>
              </ul>
            </div>
          </nav>

          <section className="highlight-clean mt-5">
            <div className="container">
                <div className="intro">
                    <h1 className="text-center">Crypto soccer ball Game</h1>
                    <p className="text-center">3 game roles :
                    <br/><b>Referee</b> : Person who create the game
                    <br/><b>MasterOwner</b> : Soccer ball Owner
                    <br/><b>Holder</b> : Person that hold the soccer ball (token owner)<br/></p>
                </div>
                {this.state.canCreateBall &&
                <div className="content mr-auto ml-auto">
                <form onSubmit={(event) => {
                  event.preventDefault()
                  this.mint()
                }}>
                  <p className="text-center">Anybody can create one and only one soccer ball</p>
                  <input
                    type='submit'
                    className='btn btn-block btn-primary'
                    value='Create One'
                    style={midbutton}
                  />
                </form>
                </div>
                }
                {!this.state.canCreateBall &&
                <p className="text-center">You already create one soccer ball</p>
                }


                <div className="mb-3">

                {this.state.ballId > 0 &&

                  <div className="content mr-auto ml-auto text-center">
                  <h3>You are the masterOwner of the ball : #{this.state.ballId}</h3>
                  <p>A masterOwner can offer the ball to anybody that is not already a masterOwner of an another ball.</p>
                  <form onSubmit={(event) => {
                    event.preventDefault()
                    this.offer(event.target.dest.value)
                    event.target.dest.value = "";
                  }}>
                    <input
                        type='text'
                        className='form-control mb-1'
                        placeholder='e.g. 0x00000'
                        id='dest'
                        style={midTextInput}
                      />
                    <input
                      type='submit'
                      className='btn btn-block btn-primary'
                      value='Offer'
                      style={midbutton}
                    />
                  </form>

                  </div>
                }
                </div>

                <div className="d-none buttons">
                    <p>You are the masterOwner of the ball :<br/>A masterOwner can offer the ball to anybody that is not already a masterOwner of an another ball.<br/></p>
                    <form>
                        <div className="form-group"><label>Recipient</label><input className="form-control" type="text"/></div>
                        <div className="form-group"><button className="btn btn-primary" type="button">Offer</button></div>
                    </form>
                    <p>Only the masterOwner of the ball can burn it<br/></p><a className="btn btn-primary" role="button" href="#">Burn it</a>
                </div>
            </div>
          </section>

          <section>
            <div className="container mt-5">
            <p>Soccer ball you hold :</p>
                <div className="row">
                {this.state.allTokenOwn != undefined && this.state.allTokenOwn.map((currentBallId, i) => {    
                   return (
                    <div key={currentBallId} className="col-sm-6 col-md-3 col-lg-3 text-center"><img className="img-fluid" style={soccerball} src="https://ipfs.io/ipfs/QmauiCZRfq8vmG3wSKcYNyJ8ZRLAM87KUoHGkj6VZmbzGa"/>
                      <p>id : {currentBallId}</p>
                    </div>
                   ) 
                })}
                { (this.state.allTokenOwn == undefined || this.state.allTokenOwn.length == 0) &&
                  <div className="col">none</div>
                }
                </div>
            </div>
          </section>

          <section className="container mt-5">
            <div className="row">
                <div className="col col-12 col-sm-12 col-md-6 col-lg-6 col-xl-6">
                    <h3>Shoot !</h3>
                    <p>Only the referee, the masterOwner and the holder of the ball can shoot into a soccer ball to send it to anybody.<br/></p>
                    <form onSubmit={(event) => {
                      event.preventDefault()
                      this.shoot(event.target.dest.value, event.target.ballId.value)
                      event.target.dest.value = "";
                      event.target.ballId.value = "";
                    }}>
                        <div className="form-group"><label>Ball Id</label><input id='ballId' className="form-control" type="text"/></div>
                        <div className="form-group"><label>Recipient</label><input id='dest' className="form-control" type="text" placeholder="Address 0x00..."/></div>
                        <div className="form-group"><input className="btn btn-primary" type="submit" value='Shoot'/></div>
                    </form>
                </div>
                <div className="col col-12 col-sm-12 col-md-6 col-lg-6 col-xl-6">
                    <h3>Steal a Soccer ball</h3>
                    <p>Anybody can steal a ball except if the ball have move less than 2 hours before or if the ball is hold by the referee or by the masterOwner.<br/></p>
                    <form onSubmit={(event) => {
                      event.preventDefault()
                      this.steal(event.target.stealId.value);
                      event.target.stealId.value = "";
                    }}>
                        <div className="form-group"><label>Ball Id</label><input id='stealId' className="form-control" type="text"/></div>
                        <div className="form-group"><input className="btn btn-primary" type="submit" value='Steal'/></div>
                    </form>
                </div>
            </div>
          </section>
          <footer className="footer-basic">
            <div className="social">
              <a href="#"><i className="icon ion-social-github"></i></a>
              <a href="#"><i className="icon ion-social-twitter"></i></a>
            </div>
          </footer>
      </div>
    );
  }



}

export default App;


