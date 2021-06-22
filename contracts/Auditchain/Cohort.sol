// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;

// import "@openzeppelin/contracts/math/SafeMath.sol";
// import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
// import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./ICohortFactory.sol";
import "./Members.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

/**
 * @title Cohort
 * Allows on creation of cohort by Enterprise based on invitations. 
 * Enterprise can create cohort consisting of invited Validators.
 * Later Enterprise can remove inactive validators and invite new ones. 
 */
contract Cohort is AccessControlEnumerableUpgradeable {
    using SafeMathUpgradeable for uint256;

    address public enterprise;
    address[] public validators;
    uint256 public platformShare; //Percentage of platform share
    uint256 public requiredQuorum;
    Members public members;
    uint256 public outstandingValidations;
    bool initialized;
    address cohortFactory;
    uint256 minValidators;

    // Create a new role identifier for the controller role
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    bytes32 public constant SETTER_ROLE = keccak256("SETTER_ROLE");

    // check if caller is authorized to make the call
    modifier isController {
        require( hasRole(CONTROLLER_ROLE, msg.sender),
            "Cohort:isController - Caller is not a controller");
        _;
    }
    /// @dev check if caller is a setter
    modifier isSetter {
        require(hasRole(SETTER_ROLE, msg.sender),
            "Members:isSetter - Caller is not a setter"
        );
        _;
    }

    // Audit types to be used. Three types added for future expansion
    enum AuditTypes {Financial, System, Contract, NFT, Type5, Type6}

    AuditTypes public audits;


    // Validation can be approved or disapproved. Initial status is undefined.
    enum ValidationStatus {Undefined, Yes, No}        

    struct Validation {
        uint256 validationTime;
        uint256 executionTime;
        string url;
        uint256 consensus;
        uint256 validationsCompleted;
        mapping(address => ValidationStatus) validatorChoice;
    }


  
    mapping(bytes32 => Validation) public validations; // track each validation
    

    mapping(address => uint256) public deposits; //track deposits per user

    event ValidationInitialized(address indexed user, bytes32 validationHash, uint256 initTime, bytes32 documentHash, string url);
    event ValidatorValidated(address validator, bytes32 indexed documentHash, uint256 validationTime, ValidationStatus decision);
    event ValidationExecuted(bytes32 indexed validationHash, uint256 indexed timeExecuted, bytes32 documentHash);
    event additionalValidatorAdded(address indexed validator);
    event ValidatorRemoved(address validator);
    event LogOutstandingValidationRest(uint256 count);
    event CohortCreated(address indexed enterprise, AuditTypes audits);


    /**
     * @dev Called from CohortFactory.sol by Enterprise within the cohort creation function    
     * @param _members               // address of Members contract   
     * @param _audits                // audit type
     * @param _cohortFactory         // address of cohort factory contract
     */
    function initialize(
        address _members,       
        uint8 _audits,
        address _cohortFactory,
        address _enterprise
    ) public {
        require(!initialized,"Cohort:initialize - this Cohort has been already initialized.");
        initialized = true;
        platformShare = 15;
        requiredQuorum = 75;
        minValidators=3;
        enterprise = _enterprise;
        cohortFactory = _cohortFactory;
        validators = ICohortFactory(cohortFactory).returnValidatorList(enterprise, _audits);
        require(validators.length >= minValidators, "Cohort:initialize - Your cohort has less validators than required minimum.");
        audits = AuditTypes(_audits);
        members = Members(_members);
        address memberAdmin = members.getRoleMember(DEFAULT_ADMIN_ROLE, 0); // get admin of token contract
        _setupRole(DEFAULT_ADMIN_ROLE, memberAdmin);
        require(ICohortFactory(cohortFactory).registerCohort(enterprise, address(this), validators, _audits), "Cohort:initialize - Cohort list couldn't be updated in CohortFactory");
        emit CohortCreated(enterprise,  AuditTypes(_audits));
    }

    /**
     * @dev returns list of validators for this cohort
     * @return array of validators
     */
    function returnValidators() public view returns (address[] memory) {
        return validators;
    }

    /**
     * @dev to be called by governance to update new amount for required quorum
     * @param _requiredQuorum new value of required quorum
     */
    function updateQuorum(uint256 _requiredQuorum) public isSetter() {
        require(_requiredQuorum != 0, "New quorum value can't be 0");
        requiredQuorum = _requiredQuorum;
    }

    function resetOutstandingValidations() public isController() {
        outstandingValidations = 0;
        emit LogOutstandingValidationRest(outstandingValidations);
    }

    function addAdditionalValidator(address validator) public returns (bool){
        require(msg.sender == cohortFactory, "Cohort:addAdditionalValidator - You are not authorized to call this function");        
        validators.push(validator);
        emit additionalValidatorAdded(validator);
        return true;
    }
    
    function removeValidator(address validator, address _enterprise) public returns (bool) {

        require(msg.sender == cohortFactory && enterprise == _enterprise, "Cohort:removeValidator - You are not authorized to call this function");
        for (uint256 i; i< validators.length; i++){

            if (validators[i] == validator) {
                validators[i] =  validators[validators.length - 1] ;
                validators.pop();                    
                emit ValidatorRemoved(validator);
                return (true);
            }
        }
         return false;
    }

    function checkIfEnterpriseHasFunds(address _enterprise) public view returns (bool) {
        return ( members.deposits(_enterprise) > members
                    .amountTokensPerValidation()
                    .mul(outstandingValidations)
                    .mul(members.enterpriseMatch())
                    .div(1e4));
    }
    /**
     * @dev to be called by Enterprise to initiate new validation
     * @param documentHash - hash of unique identifier of validated transaction
     */
    function initializeValidation(bytes32 documentHash, string memory url) public {
        // div(1e4) account for precision up to 4 decimal points
        require(checkIfEnterpriseHasFunds(msg.sender), "Cohort:initializeValidation - Not sufficient funds. Deposit additional funds.");
        require(documentHash.length > 0, "Cohort:initializeValidation - Document hash value can't be 0");
        require(enterprise == msg.sender, "Cohort:initializeValidation - Only enterprise owing this cohort can call this function");
        uint256 validationTime = block.timestamp;
        bytes32 validationHash = keccak256(abi.encodePacked(documentHash, validationTime));

        outstandingValidations++;
        // Validation storage newValidation = validations[validationHash];
        // newValidation.validationTime = block.timestamp;
        // newValidation.url= url;

        validations[validationHash].validationTime = block.timestamp;
        validations[validationHash].url = url;

        emit ValidationInitialized(msg.sender, validationHash, validationTime, documentHash, url);
    }

    /**
     * @dev Review the validation results
     * @param validationHash - consist of hash of hashed document and timestamp
     * @return array  of validators
     * @return array of stakes of each validator
     * @return array of validation choices for each validator
     */
    function collectValidationResults(bytes32 validationHash)
        public
        view
        returns (
            address[] memory,
            uint256[] memory,
            ValidationStatus[] memory
        )
    {
        address[] memory validatorsList = validators;
        uint256[] memory stake = new uint256[](validators.length);
        ValidationStatus[] memory validatorsValues = new ValidationStatus[](validators.length);

        Validation storage validation = validations[validationHash];

        for (uint256 i = 0; i < validators.length; i++) {
            stake[i] = members.deposits(validators[i]);
            validatorsValues[i] = validation.validatorChoice[validators[i]];
        }
        return (validatorsList, stake, validatorsValues);
    }

    /**
     * @dev validators can check if specific document has been already validated by them
     * @param validationHash - consist of hash of hashed document and timestamp
     * @return validation choices used by validator
     */
    function isValidated(bytes32 validationHash) public view returns (ValidationStatus){
        return validations[validationHash].validatorChoice[msg.sender];
    }

    /**
     * @dev to calculate state of the quorum for the validation
     * @param validationHash - consist of hash of hashed document and timestamp
     * @return number representing current participation level in percentage
     */
    function calculateVoteQuorum(bytes32 validationHash)
        public
        view
        returns (uint256)
    {
        uint256 totalStaked;
        uint256 currentlyVoted;

        Validation storage validation = validations[validationHash];
        require(validation.validationTime > 0, "Cohort:calculateVoteQuorum - Validation hash doesn't exist");

        for (uint256 i = 0; i < validators.length; i++) {
            totalStaked += members.deposits(validators[i]);
            if (validation.validatorChoice[validators[i]] != ValidationStatus.Undefined) 
                currentlyVoted += members.deposits(validators[i]);
        }
        return (currentlyVoted * 100) / totalStaked;
    }

    function determineConsensus(ValidationStatus[] memory validation) public pure returns(uint256 ) {

        // const validatorsValues = validation[2];
        uint256 yes;
        uint256 no;

        for (uint256 i=0; i< validation.length; i++) {

            if (validation[i] == ValidationStatus.Yes)
                yes++;
            else
                no++;
        }

        if (yes > no)
            return 1; // consensus is to approve
        else if (no > yes)
            return 2; // consensus is to disapprove
        else
            return 0; // consensus is tie - should not happen
    }

    function processPayments(bytes32 validationHash) internal {

        Validation storage validation = validations[validationHash];
        address[] memory activeValidators = new address[](validation.validationsCompleted);

        (address[] memory user, ,ValidationStatus[] memory status) =  collectValidationResults(validationHash);

        for (uint256 i=0; i< user.length; i++){
            if (status[i] == ValidationStatus.Yes || status[i] == ValidationStatus.No)
                activeValidators[i] = user[i];
        }

        members.processPayment(activeValidators);
        
    }

    /**
     * @dev to mark validation as executed. This happens when participation level reached "requiredQuorum"
     * @param validationHash - consist of hash of hashed document and timestamp
     */
    function executeValidation(bytes32 validationHash, bytes32 documentHash) internal {
        if (calculateVoteQuorum(validationHash) >= requiredQuorum) {
            Validation storage validation = validations[validationHash];
            validation.executionTime = block.timestamp;

            (,, ValidationStatus[] memory results) = collectValidationResults(validationHash);

            // validation.consensus = determineConsensus(results);
            validation.consensus = 1;

            processPayments(validationHash);
            emit ValidationExecuted(validationHash, block.timestamp, documentHash);
        }
    }

    /**
     * @dev called by validator to approve or disapprove this validation
     * @param documentHash - hash of validated document
     * @param validationTime - this is the time when validation has been initialized
     * @param decision - one of the ValidationStatus choices cast by validator
     */
    function validate(
        bytes32 documentHash,
        uint256 validationTime,
        ValidationStatus decision
    ) public {
        bytes32 validationHash = keccak256(abi.encodePacked(documentHash, validationTime));
        Validation storage validation = validations[validationHash];
        require(members.userMap(msg.sender, 1), "Cohort:validate - Validator is not authorized.");
        require(validation.validationTime == validationTime, "Cohort:validate - the validation params don't match.");
        require(validation.validatorChoice[msg.sender] ==ValidationStatus.Undefined, "Cohort:validate - This document has been validated already.");
        validation.validatorChoice[msg.sender] = decision;
        validation.validationsCompleted ++;


        if (validation.executionTime == 0) 
            executeValidation(validationHash, documentHash);

        emit ValidatorValidated(msg.sender, documentHash, validationTime, decision);
    }

    function isHashAndTimeCorrect( bytes32 documentHash, uint256 validationTime) public view returns (bool){

        bytes32 validationHash = keccak256(abi.encodePacked(documentHash, validationTime));
        Validation storage validation = validations[validationHash];
        if (validation.validationTime == validationTime)
            return true;
        else
            return false;
    }
}
