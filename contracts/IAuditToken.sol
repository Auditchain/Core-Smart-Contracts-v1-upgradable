// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

    
interface IAuditToken {
    function mint(address to, uint256 amount) external returns (bool) ;
    function transferFrom(address from, address to, uint256 value) external  returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}
