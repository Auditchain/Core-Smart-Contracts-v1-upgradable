import { assert } from 'chai';
import { en } from 'ethers/wordlists';
import {
    ensureException,
    duration
} from './helpers/utils.js';

const MEMBERS = artifacts.require('../Members');
const MEMBER_HELPERS = artifacts.require('../MemberHelpers')
const TOKEN = artifacts.require('../AuditToken');
const COHORTFACTORY = artifacts.require('../CohortFactory');
const VALIDATION = artifacts.require('../ValidationsNoCohort');
const NODE_OPERATIONS = artifacts.require('../NodeOperations');
const DEPOSIT_MODIFIERS = artifacts.require('../DepositModifiers');
const VALIDATION_HELPERS = artifacts.require('../ValidationHelpers');
const QUEUE = artifacts.require("../Queue");







var BigNumber = require('big-number');
let SETTER_ROLE = web3.utils.keccak256("SETTER_ROLE");
import expectRevert from './helpers/expectRevert';




contract("Member Helper contract", (accounts) => {

    const admin = accounts[0];
    const enterprise1 = accounts[1];
    const validator1 = accounts[3];
    const validator2 = accounts[4];
    const validator3 = accounts[5];
    const dataSubscriber = accounts[6];
    const platformAccount = accounts[7];
    const validator4 = accounts[8];


    let members;
    let token;
    let memberHelpers;
    let cohortFactory;
    let validationHelpers
    let validation;
    let nodeOperations;
    let depositModifiers;
    let queue;
    let CONTROLLER_ROLE;

    let auditTokenMin = "5000000000000000000000";
    let auditTokenLesMin = "1";
    let auditTokenMorMax = "25100000000000000000000";
    let auditTokenMax = "25000000000000000000000";
    let initialToken = "2500000000000000000000000000";
    let documentHash;
    const documentURL = "http://xbrlsite.azurewebsites.net/2021/reporting-scheme/proof/reference-implementation/instance.xml";
    let price = "1000000000000000000";




    let rewardTokens = "1000000000000000000";
    let tokenPerValidation;
    CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
    let MINTER_ROLE = web3.utils.keccak256("MINTER_ROLE");


    before(async () => {

        token = await TOKEN.deployed();
        members = await MEMBERS.deployed();
        memberHelpers = await MEMBER_HELPERS.deployed();
        cohortFactory = await COHORTFACTORY.deployed();
        nodeOperations = await NODE_OPERATIONS.deployed();
        depositModifiers = await DEPOSIT_MODIFIERS.deployed();
        queue = await QUEUE.deployed();
        validationHelpers = await VALIDATION_HELPERS.deployed();
        validation = await VALIDATION.deployed();

        await token.grantRole(MINTER_ROLE, admin, { from: admin });
        await token.mint(admin, initialToken, { from: admin });

        await token.grantRole(MINTER_ROLE, memberHelpers.address, { from: admin });




        // token = await TOKEN.new(admin);
        // members = await MEMBERS.new(platformAccount);
        // memberHelpers = await MEMBER_HELPERS.new(members.address, token.address)

        // cohortFactory = await COHORTFACTORY.new(members.address, memberHelpers.address);
        // nodeOperations = await NODE_OPERATIONS.new(memberHelpers.address, token.address, members.address);
        // validationHelpers = await VALIDATION_HELPERS.new(memberHelpers.address);
        // depositModifiers = await DEPOSIT_MODIFIERS.new(members.address, token.address, memberHelpers.address, cohortFactory.address, nodeOperations.address)
        // validation = await VALIDATION.new(members.address, memberHelpers.address, cohortFactory.address, depositModifiers.address, nodeOperations.address, validationHelpers.address)

        // await memberHelpers.grantRole(CONTROLLER_ROLE, admin, { from: admin });
        // await members.grantRole(CONTROLLER_ROLE, admin, { from: admin });
        // await nodeOperations.grantRole(CONTROLLER_ROLE, validation.address, { from: admin });
        // await memberHelpers.grantRole(CONTROLLER_ROLE, validation.address, { from: admin });
        // await memberHelpers.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: admin });
        // await memberHelpers.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });

        // await token.grantRole(CONTROLLER_ROLE, nodeOperations.address, { from: admin });
        // await depositModifiers.grantRole(CONTROLLER_ROLE, validation.address, { from: admin });
        // await token.grantRole(CONTROLLER_ROLE, depositModifiers.address, { from: admin });
        // await token.grantRole(CONTROLLER_ROLE, memberHelpers.address, { from: admin });


        // await memberHelpers.setValidation(validation.address, {from:admin});

        tokenPerValidation = await members.amountTokensPerValidation();

        await token.grantRole(MINTER_ROLE, admin, { from: admin });
        await token.mint(admin, initialToken, { from: admin });
        await queue.grantRole(CONTROLLER_ROLE, validation.address, { from: admin });



        // await memberHelpers.setCohortFactory(cohortFactory.address, { from: admin });



    })


    describe("Deploy", async () => {

        it("Should succeed. Initialize members with Audit token", async () => {
            let tokenAddress = await memberHelpers.auditToken();
            assert.strictEqual(tokenAddress, token.address);

        })
    })

    describe("Set Validation ", async () => {

        it("Should succeed. Validation address has been set", async () => {

            await memberHelpers.setValidation(validation.address);
            let validationAddress = await memberHelpers.validations();
            assert.strictEqual(validationAddress, validation.address);
        })

        it("Should fail. Validation address has been set by not authorized user", async () => {

            try {
                await memberHelpers.setValidation(validation.address, { from: validator2 });

                expectRevert()
            } catch (error) {
                ensureException(error);
            }
        })

        it("Should fail. Validation address has been set by authorized user, but with address 0", async () => {

            try {
                await memberHelpers.setValidation("0x0000000000000000000000000000000000000000", { from: admin });

                expectRevert()
            } catch (error) {
                ensureException(error);
            }
        })
    })


    describe("Stake by validators", async () => {

        before(async () => {

            // await members.addValidatorUser(validator1, "Validators 1", { from: admin });
            const result = await members.addUser(validator1, "Validator 1", 1, { from: admin });

            await token.transfer(validator1, auditTokenMin, { from: admin });
            await token.approve(memberHelpers.address, auditTokenMin, { from: validator1 });
        })

        it("Should succeed. Validator stakes tokens.", async () => {

            let result = await memberHelpers.stake(auditTokenMin, { from: validator1 });
            assert.lengthOf(result.logs, 1);

            let event = result.logs[0];
            assert.equal(event.event, 'LogDepositReceived');
            assert.strictEqual(event.args.from, validator1);
            assert.strictEqual(event.args.amount.toString(), auditTokenMin);
        })

        it("Should fail. User hasn't been registered as validator.", async () => {
            try {
                await memberHelpers.stake(auditTokenMin, { from: validator2 });
                expectRevert()
            } catch (error) {
                ensureException(error);
            }
        })

        it("Should fail. User contributed less than required amount.", async () => {

            try {
                let result = await memberHelpers.stake(auditTokenLesMin, { from: validator1 });
                expectRevert()
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should fail. User contributed more than required amount.", async () => {

            await members.addUser(validator2, "Validator 2", 1, { from: admin });
            await token.transfer(validator2, auditTokenMorMax, { from: admin });
            await token.approve(memberHelpers.address, auditTokenMorMax, { from: validator2 });

            try {
                let result = await memberHelpers.stake(auditTokenMorMax, { from: validator2 });
                expectRevert()

            } catch (error) {
                ensureException(error);
            }

        })

    })

    describe("Deposit by Enterprise", async () => {

        before(async () => {

            await members.addUser(enterprise1, "Enterprise 1", 0, { from: admin });

            await token.transfer(enterprise1, auditTokenMin, { from: admin });
            await token.approve(memberHelpers.address, auditTokenMin, { from: enterprise1 });
        })

        it("Should succeed. Enterprise deposits tokens.", async () => {

            let result = await memberHelpers.stake(auditTokenMin, { from: enterprise1 });
            assert.lengthOf(result.logs, 1);

            let event = result.logs[0];
            assert.equal(event.event, 'LogDepositReceived');
            assert.strictEqual(event.args.from, enterprise1);
            assert.strictEqual(event.args.amount.toString(), auditTokenMin);
        })

        it("Should fail. User hasn't been registered as enterprise.", async () => {
            try {
                result = await memberHelpers.stake(auditTokenMin, { from: admin });
                expectRevert()
            } catch (error) {
                ensureException(error);
            }
        })
    })

})