// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;    
    
interface ICohortFactory {

    function returnCohorts(address enterprise) external view returns (address[] memory, uint256[] memory);
    function returnOutstandingValidations() external view returns(uint256);
    function returnValidatorList(address enterprise, uint8 audit) external view returns (address[] memory );
    function registerCohort(address enterprise, address cohortAddress, address[] memory validators, uint8 audit) external  returns (bool);
}
