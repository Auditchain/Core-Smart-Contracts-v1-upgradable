// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;

import "./Validations.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";



contract ValidationsNoCohort is Validations {
    using SafeMathUpgradeable for uint256;

    function initialize(address _members, address _memberHelpers, address _cohortFactory, address _depositModifiers, address _nodeOperations,  address _validationHelpers, address _queue) public override {
        super.initialize(_members, _memberHelpers, _cohortFactory, _depositModifiers, _nodeOperations, _validationHelpers, _queue);

    }

    /**
    * @dev to be called by data subscriber to initiate new validation
    * @param documentHash - hash of unique identifier of validated transaction
    * @param url - locatoin of the file on IPFS or   function returnValidatorList(bytes32 validationHash) public view override  returns (address[] memory){
    * @param auditType - type of auditing 
    */
    function initializeValidationNoCohort(bytes32 documentHash, string memory url, AuditTypes auditType, uint256 price) public {

        require(checkIfRequestorHasFunds(msg.sender, price), "ValidationsNoCohort:initializeValidationNoCohort - Not sufficient funds. Deposit additional funds.");
        require(members.userMap(msg.sender, IMembers.UserType(2)), "ValidationsNoCohort:initializeValidationNoCohort - You have to register as data subscriber");
        super.initializeValidation(documentHash, url, auditType, false, price);
        
    }

   /**
   * @dev verify if requesting party has sufficient funds
   * @param requestor a user whos funds are checked
   * @return true or false 
   */
      function checkIfRequestorHasFunds(address requestor, uint256 price) public override view returns (bool) {

          return ( memberHelpers.deposits(requestor) > price.mul(outstandingValidations[requestor].add(1)));
    }


    function processPayments(bytes32 validationHash, address winner) internal override { 

        Validation storage validation = validations[validationHash];
        outstandingValidations[validation.requestor] = outstandingValidations[validation.requestor].sub(1);
        depositModifiers.processNonChortPayment(winner, validation.requestor, validationHash, validation.price);
        emit PaymentProcessed(validationHash, winner, validation.winnerVotesPlus[winner], validation.winnerVotesMinus[winner]);
    }

    function validate(bytes32 documentHash, uint256 validationTime, address subscriber, ValidationStatus decision, string memory valUrl, bytes32 reportHash) public override {
        super.validate(documentHash, validationTime, subscriber, decision, valUrl, reportHash);
    }

    function returnValidatorCount(bytes32 recentValidationHash) public view override returns (uint256){
        // return nodeOperations.returnNodeOperatorsCount();

        (address[] memory nodeOperators,,,,,) = collectValidationResults(recentValidationHash);
        return nodeOperators.length;
        
    }

    function returnValidatorList(bytes32 validationHash) public view override  returns (address[] memory){

        address[] memory validatorsList = nodeOperations.returnNodeOperators();
        return validatorsList;
    }


       function returnValidatorListActual(bytes32 validationHash) public view returns (address[] memory){

        //  (address[] memory nodeOperators,,,,,)  = collectValidationResults(validationHash);
        Validation storage validation = validations[validationHash];
        uint256 j=0;

        address[] memory validatorListActive = new address[](validation.validationsCompleted);
        address[] memory validatorsList = nodeOperations.returnNodeOperators();

         for (uint256 i = 0; i < validatorsList.length; i++) {
            if(validation.validatorChoice[validatorsList[i]] != ValidationStatus.Undefined) {
                validatorListActive[j] = validatorsList[i];
                j++;
            }
        }
        return validatorListActive;
    }



}