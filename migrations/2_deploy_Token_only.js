const Token = artifacts.require('./AuditToken.sol');


const ethers = require('ethers');
const timeMachine = require('ganache-time-traveler');
const abi = new ethers.utils.AbiCoder();

const { upgradeProxy, deployProxy } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer, network, accounts) { // eslint-disable-line..
    let admin = accounts[0];
    await deployProxy(Token, [admin], { deployer, initializer: 'initialize' });
    let token = await Token.deployed();
    console.log("token address:", token.address);


};

