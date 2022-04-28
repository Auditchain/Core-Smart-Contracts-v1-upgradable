import { assert } from 'chai';
import { en } from 'ethers/wordlists';
import {
    ensureException,
    duration
} from './helpers/utils.js';

const MEMBERS = artifacts.require('../Members');
const TOKEN = artifacts.require('../AuditToken');

var BigNumber = require('big-number');
let SETTER_ROLE = web3.utils.keccak256("SETTER_ROLE");



contract("Member contract", (accounts) => {

    const admin = accounts[0];
    const platformAccount = accounts[1];
    const validator1 = accounts[2];
    const validator2 = accounts[3];
    const validator3 = accounts[4];
    const dataSubscriber = accounts[5];
    const enterprise1 = accounts[6];
    const validator4 = accounts[7];


    let members;
    let token;
    let CONTROLLER_ROLE;

    let auditTokenMin = "5000000000000000000000";
    let auditTokenLesMin = "1";
    let auditTokenMorMax = "25100000000000000000000";
    let auditTokenMax = "25000000000000000000000";

    let rewardTokens = "1000000000000000000";
    CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");


    before(async () => {

        token = await TOKEN.deployed();
        members = await MEMBERS.deployed();
        await members.grantRole(CONTROLLER_ROLE, admin, { from: admin });
        
    })


    describe("Deploy", async () => {

        it("Should succeed. Initialize members with Audit token", async () => {

            let platformAddress = await members.platformAddress();
            assert.strictEqual(platformAddress, platformAccount);
        })
    })

    describe("Enter Enterprise User", async () => {

        it("Should fail.Add enterprise user from unauthorized account", async () => {

            try {
                await members.addUser(enterprise1, "Enterprise 1", 0, { from: enterprise1 });
                expectRevert();
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should succeed. Add enterprise user from authorized account", async () => {
            const result = await members.addUser(enterprise1, "Enterprise 1", 0, { from: admin });

            assert.lengthOf(result.logs, 1);

            let event = result.logs[0];
            assert.equal(event.event, 'UserAdded');
            assert.strictEqual(event.args.user, enterprise1);
            assert.strictEqual(event.args.name, "Enterprise 1");
        })


    })


    describe("Enter Validator User", async () => {

        it("Should fail. Add validator user from unauthorized account", async () => {

            try {
                await members.addUser(validator1, "Validator 1", 1, { from: enterprise1 })
                expectRevert();
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should succeed. Add validator user from authorized account", async () => {
            const result = await members.addUser(validator1, "Validator 1", 1, { from: admin });

            assert.lengthOf(result.logs, 1);

            let event = result.logs[0];
            assert.equal(event.event, 'UserAdded');
            assert.strictEqual(event.args.user, validator1);
            assert.strictEqual(event.args.name, "Validator 1");
        })


    })


    describe("Test governance updates", async () => {


        it("It should succeed. updatePlatformShareValidation was updated by authorized user.", async () => {

            await members.grantRole(SETTER_ROLE, admin, { from: admin });
            await members.updatePlatformShareValidation("40", { from: admin });
            let platformShareValidation = await members.platformShareValidation();
            assert.strictEqual(platformShareValidation.toString(), "40");
        })


        it("It should fail.updatePlatformShareValidation was updated by unauthorized user.", async () => {

            try {
                await members.updatePlatformShareValidation("40", { from: enterprise1 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("It should fail.updatePlatformShareValidation was updated by authorized user with amount 0", async () => {

            try {
                await members.updatePlatformShareValidation("0", { from: admin });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })


        it("It should succeed. Reward per validation was updated by authorized user.", async () => {

            await members.grantRole(SETTER_ROLE, admin, { from: admin });
            await members.updateTokensPerValidation(auditTokenMin, { from: admin });
            let newReward = await members.amountTokensPerValidation();
            assert.strictEqual(newReward.toString(), auditTokenMin.toString());
        })


        it("It should fail. Reward per validation was updated by unauthorized user.", async () => {

            try {
                await members.updateTokensPerValidation(auditTokenMin, { from: enterprise1 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("It should fail. Reward per validation was updated by authorized user with value of 0", async () => {

            try {
                await members.updateTokensPerValidation("0", { from: admin });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("It should succeed. updateMinDepositDays was updated by authorized user.", async () => {

            // await members.grantRole(SETTER_ROLE, admin, { from: admin });
            await members.updateMinDepositDays("40", { from: admin });
            let minDepositDays = await members.minDepositDays();
            assert.strictEqual(minDepositDays.toString(), "40");
        })


        it("It should fail. updateMinDepositDays was updated by unauthorized user.", async () => {

            try {
                await members.updateMinDepositDays(40, { from: enterprise1 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("It should fail. updateMinDepositDays was updated by authorized user with value of - 0", async () => {

            try {
                await members.updateMinDepositDays(0, { from: admin });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })


        it("It should succeed. updateAccessFee was updated by authorized user.", async () => {

            // await members.grantRole(SETTER_ROLE, admin, { from: admin });
            await members.updateAccessFee("40", { from: admin });
            let accessFee = await members.accessFee();
            assert.strictEqual(accessFee.toString(), "40");
        })


        it("It should fail. updateAccessFee was updated by unauthorized user.", async () => {

            try {
                await members.updateAccessFee(40, { from: enterprise1 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("It should fail. updateAccessFee was updated by authorized user with value of 0.", async () => {

            try {
                await members.updateAccessFee(40, { from: enterprise1 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("It should succeed. updateEnterpriseMatch was updated by authorized user.", async () => {

            await members.grantRole(SETTER_ROLE, admin, { from: admin });
            await members.updateEnterpriseMatch("40", { from: admin });
            let newMatchValue = await members.enterpriseMatch();
            assert.strictEqual(newMatchValue.toString(), "40");
        })


        it("It should fail. updateEnterpriseMatch was updated by unauthorized user.", async () => {

            try {
                await members.updateEnterpriseMatch("40", { from: enterprise1 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("It should fail. updateEnterpriseMatch was updated by authorized user with value of 0.", async () => {

            try {
                await members.updateEnterpriseMatch("0", { from: admin });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("It should succeed. Quorum amount was updated by authorized user.", async () => {


            // await members.grantRole(SETTER_ROLE, admin, { from: admin });
            await members.updateQuorum("20", { from: admin });
            let newQuorum = await members.requiredQuorum();
            assert.strictEqual(newQuorum.toString(), "20");
        })


        it("It should fail. Quorum amount was updated by unauthorized user.", async () => {

            try {
                await members.updateQuorum("20", { from: enterprise1 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("It should fail. Quorum amount was updated by authorized user with value of 0", async () => {

            try {
                await members.updateQuorum("0", { from: admin });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })



        it("It should succeed. updateDataSubscriberShares was updated by authorized user.", async () => {


            // await members.grantRole(SETTER_ROLE, admin, { from: admin });
            await members.updateDataSubscriberShares("30", "40", { from: admin });
            let enterpriseShareSubscriber = await members.enterpriseShareSubscriber();
            let validatorShareSubscriber = await members.validatorShareSubscriber();

            assert.strictEqual(enterpriseShareSubscriber.toString(), "30");
            assert.strictEqual(validatorShareSubscriber.toString(), "40");

        })


        it("It should fail. updateDataSubscriberShares was updated by unauthorized user.", async () => {

            try {
                await members.updateDataSubscriberShares("30", "40", { from: enterprise1 });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("It should fail. updateDataSubscriberShares was updated with values out of bounds.", async () => {
            
            try {
                await members.updateDataSubscriberShares("70", "40", { from: admin });
                expectRevert();
            }
            catch (error) {
                ensureException(error);
            }
        })



    })


})