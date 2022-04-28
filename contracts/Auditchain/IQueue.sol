// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;    
    
interface IQueue {


    function addToQueue(uint256 _price, bytes32 _validationHash) external;
    function removeFromQueue(bytes32 _valHash) external;
    function setValidatedFlag(bytes32 _valHash) external;
    function replaceValidation(uint256 newPrice, bytes32 _valHash) external;
}