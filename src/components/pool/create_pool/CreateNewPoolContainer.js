import CreateNewPool from './CreateNewPool';

import {connect} from 'react-redux';
import {deploySmartTokenInit, deploySmartTokenPending, deploySmartTokenReceipt, deploySmartTokenConfirmation,
  deploySmartTokenError, deploySmartTokenSuccess, deployRelayConverterStatus, setRelayTokenContractReceipt, setPoolFundedStatus,
  setActivationStatus, setPoolCreationReceipt, setTokenListDetails, setTokenListRow
} from '../../../actions/pool';

import {toDecimals, fromDecimals} from '../../../utils/eth';
const SmartToken = require('../../../contracts/SmartToken.json');
const SmartTokenByteCode = require('../../../contracts/SmartTokenByteCode.js');
const RegistryUtils = require('../../../utils/RegistryUtils');
const BancorConverter = require('../../../contracts/BancorConverter.json');
const BancorConverterByteCode = require('../../../contracts/BancorConverterByteCode.js');
const ContractRegistry = require('../../../contracts/ContractRegistry.json');
const axios = require('axios');
const ERC20Token = require('../../../contracts/ERC20Token.json');

const BigNumber = require('bignumber.js');

const mapStateToProps = state => {
  return {
    pool: state.pool,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    deployPoolContract: (args) => {
        const web3 = window.web3;
        
        const walletAddress = web3.currentProvider.selectedAddress;
        
        const smartTokenContract = new web3.eth.Contract(SmartToken);
    
        const bytecode ='0x' + SmartTokenByteCode.ByteCode;
        
        dispatch(deploySmartTokenInit({'message': 'Waiting for user approval', 'symbol': args.poolSymbol}));
                  
        let deployer = smartTokenContract.deploy({data : bytecode, arguments: [
          args.poolName, 
          args.poolSymbol,
          args.poolDecimals
          ]});
    
          deployer.send({
            from: walletAddress
        
        }, function(error, transactionHash){ 
          if (error) {
            dispatch(deploySmartTokenError(error));
          }
          dispatch(deploySmartTokenPending(transactionHash));
        })
        .on('error', function(error){ 
         dispatch(deploySmartTokenError(error));
        })
        .on('transactionHash', function(transactionHash){ 
           dispatch(deploySmartTokenPending(transactionHash));
        })
        .on('receipt', function(receipt){
         dispatch(deploySmartTokenReceipt(receipt));
        })
        .on('confirmation', function(confirmationNumber, receipt){
          dispatch(deploySmartTokenConfirmation(receipt));
          
        })
        .then(function(newContractInstance){
          dispatch(deploySmartTokenSuccess(newContractInstance));
        });
    
    },
    
    deployRelayConverter: (args) => {
    const web3 = window.web3;
    
    const maxFee = args.maxFee * 10000;
    
    let relayToken = args.tokenAddressList.find((a)=>(a.type === 'relay'));
    let connectorAddedIndex = -1;
    if (!relayToken || typeof relayToken === undefined) {
      relayToken = args.tokenAddressList[0];
      connectorAddedIndex = 0;
    }
    const relayTokenAddress = relayToken.address;
    const relayTokenWeight = relayToken.weight;
    
    const conversionFee = maxFee;
    const smartTokenAddress = args.smartTokenAddress;

    // Set converter details in reducer
    
    getTokenListData(args.tokenAddressList).then(function(tokenListDetails){
      
      dispatch(setTokenListDetails(tokenListDetails));
      
      // Deploy the converter and add the first reserve i.e. relay token BNT or USDB as first step
    
      RegistryUtils.getContractAddress('ContractRegistry').then(function(contractRegistryContractAddress){
      const walletAddress = web3.currentProvider.selectedAddress;
      const bancorConverterContract = new web3.eth.Contract(BancorConverter);
      const bytecode ='0x' + BancorConverterByteCode.ByteCode;

      const deployer = bancorConverterContract.deploy({data : bytecode, arguments: [
                        smartTokenAddress, 
                        contractRegistryContractAddress,
                        maxFee,
                        relayTokenAddress,
                        relayTokenWeight
                      ]});
      
      deployer.send({
        from: walletAddress
    
      }, function(error, transactionHash){ 

       })
      .on('error', function(error){ 
        dispatch(deployRelayConverterStatus({type: 'error', message: error.message}))
      })
      .on('transactionHash', function(transactionHash){ 
          dispatch(deployRelayConverterStatus({type: 'pending',
          message: `Deploying Bancor converter contract hash ${transactionHash}`}));
      })
      .on('receipt', function(receipt){

   
      })
      .on('confirmation', function(confirmationNumber, receipt){
          dispatch(deployRelayConverterStatus({type: 'pending',
          message: `Finished deplying Bancor converter contract `}));

          dispatch(setRelayTokenContractReceipt(receipt))        
      })
      .then(function(deployerContractInstance){
          dispatch(deployRelayConverterStatus({type: 'pending',
          message: `Adding network connector`}));

          let convertibleTokenDeploy = args.tokenAddressList.map(function(item, idx){
            if (item.type === 'convertible' && idx != connectorAddedIndex) {
              return   deployerContractInstance.methods.addConnector(item.address, item.weight, false).call()
                .then(function(data){
                dispatch(deployRelayConverterStatus({type: 'pending',
                message: `Setting conversion fees`}));
              })
              
            } else {
              return null;
            }
          });
          
          Promise.all(convertibleTokenDeploy).then(function(response){
              deployerContractInstance.methods.setConversionFee(conversionFee).call().then(function(dataRes){
                dispatch(deployRelayConverterStatus({type: 'success',
                message: `Relay token is ready to be used`}));
              });
          });
      });
    
  });
  
    });
    
    },
    
    getTokenDetailFromAddress: (val, idx) => {
      const web3 = window.web3;
      
      const ERC20TokenContract = new web3.eth.Contract(ERC20Token, val);
      if (val && val.length > 0) {
      
      ERC20TokenContract.methods.symbol().call().then(function(tokenSymbol){
      //  return tokenSymbol;
        axios.get(`https://min-api.cryptocompare.com/data/price?fsym=${tokenSymbol}&tsyms=USD`).then(function(dataResponse){
          let tokenPrice = "";
          if (dataResponse.data && dataResponse.data.USD) {
            tokenPrice = dataResponse.data.USD;
          }
          const poolData = {'idx': idx, 'data': {'address': val, 'symbol': tokenSymbol, 'price': tokenPrice}};
         dispatch(setTokenListDetails(poolData));  
        })
      })
      }
      
    },
    
    setTokenList: (tokenList) => {

      
    },
    
    fundRelayWithSupply: (args) => {

      const web3 = window.web3;
      
      const smartTokenAddress = args.smartTokenAddress;

      const bancorConverterAddress = args.converterAddress;
      
      const smartTokenContract = new web3.eth.Contract(SmartToken, smartTokenAddress);      

      const senderAddress = web3.currentProvider.selectedAddress;
      
      const supplyAmount = toDecimals(args.initialSupply, 18);
      
      const convertibleTokens = args.convertibleTokens;
      dispatch(setPoolFundedStatus({'type': 'pending', 'message': "Waiting for user approval of pool supply"}));
      smartTokenContract.methods.issue(senderAddress, supplyAmount).send({from: senderAddress}, function(err, txHash){
      dispatch(setPoolFundedStatus({'type': 'pending', 'message': "Creating initial pool supply"}));
      }).then(function(response){
        
        (async () => {
        let totalConversions = convertibleTokens.length - 1;
        for (let job of convertibleTokens.map((x, idx) => () =>
          approveAndFundPool(x, bancorConverterAddress, dispatch, idx, totalConversions)
        ))
        await job();
        })();

      });
    },
    
    activatePool: (args) => {
      const web3 = window.web3;
      const senderAddress = web3.currentProvider.selectedAddress;
            
      const smartTokenContract = new web3.eth.Contract(SmartToken, args.smartTokenAddress);
      const converterContract = new web3.eth.Contract(BancorConverter, args.converterAddress);
      dispatch(setActivationStatus({'type': 'pending', 'message': 'Waiting for user approval'}));
      smartTokenContract.methods.transferOwnership(args.converterAddress).send({
        from: senderAddress
      }).then(function(transferOwnershipResponse){
        dispatch(setActivationStatus({'type': 'pending', 'message': 'Transferring ownership of pool to converter'}));
        converterContract.methods.acceptTokenOwnership().send({
          from: senderAddress 
        }).then(function(senderAcceptResponse){
          dispatch(setActivationStatus({'type': 'success', 'message': 'Finished activating pool'}));
        })
      })
      
    },
    
    getConverterAndPoolDetails: (args) => {
      const web3 = window.web3;
      
      const poolTokenAddress = args.poolTokenAddress;
      const converterAddress = args.converterAddress;
      
      const BancorConverterContract =  new web3.eth.Contract(BancorConverter, converterAddress);
      const PoolTokenContract = new web3.eth.Contract(SmartToken, poolTokenAddress);

      
      PoolTokenContract.methods.name().call().then(function(poolName){
        PoolTokenContract.methods.symbol().call().then(function(poolSymbol){
          PoolTokenContract.methods.totalSupply().call().then(function(poolSupply){
            
    
          BancorConverterContract.methods.connectorTokenCount().call().then(function(connectorTokenCount){
            BancorConverterContract.methods.connectorTokens(0).call().then(function(token1){
              
              BancorConverterContract.methods.getReserveRatio(token1).call().then(function(connectorReserveRatio){
                
              BancorConverterContract.methods.getReserveBalance(token1).call()
              .then(function(connectorReserveBalance){
                const payload = {connectorBalance: fromDecimals(connectorReserveBalance, 18),
                  connectorWeight: connectorReserveRatio / 10000, poolName: poolName, poolSymbol: poolSymbol,
                  poolSupply: fromDecimals(poolSupply, 18), numConnectors: connectorTokenCount,
                  connectorAdress: token1,
                };

                dispatch(setPoolCreationReceipt(payload));
            })
          })
        })
          })
          })  
      })
      })
    }
  }
}

async function approveAndFundPool(convertibleToken, bancorConverterAddress, dispatch, idx, totalConversions) {

      const web3 = window.web3;
      const senderAddress = web3.currentProvider.selectedAddress;

      const convertibleTokenContract = new web3.eth.Contract(ERC20Token, convertibleToken.address);  
      
      return convertibleTokenContract.methods.decimals().call().then(function(decimals){

      const convertibleTokenAmount = parseFloat(convertibleToken.amount);
      
      let convertibleTokenApprovalAmount = convertibleTokenAmount;
      
      const convertibleTokenMinAmount = toDecimals(convertibleTokenAmount, decimals);
      
      const convertibleTokenMinApprovalAmount = toDecimals(convertibleTokenApprovalAmount, decimals);
      
      return convertibleTokenContract.methods.allowance(senderAddress, bancorConverterAddress).call().then(function(allowance) {
        if (!allowance || typeof allowance === undefined) {
          allowance = 0;
        }

        const required = new BigNumber(convertibleTokenMinApprovalAmount);

        let diff = new BigNumber(allowance).minus(required);

        if (diff.isNegative()) {
          dispatch(setPoolFundedStatus({'type': 'pending', 'message': `waiting for user authorization of ${convertibleToken.symbol} transfer`}));
          return convertibleTokenContract.methods.approve(bancorConverterAddress, convertibleTokenMinApprovalAmount).send({
            from: senderAddress
          }, function(err, txHash){
            dispatch(setPoolFundedStatus({'type': 'pending', 'message': `Authorizing ${convertibleToken.symbol} transfer to contract`}));
          }).then(function(approval){
          return convertibleTokenContract.methods.transfer(bancorConverterAddress, convertibleTokenMinAmount).send({from: senderAddress}, function(err, txHash){
              dispatch(setPoolFundedStatus({'type': 'pending', 'message': `transferring ${convertibleToken.amount} ${convertibleToken.symbol} to contract`}));
            }).then(function(txSuccess){

              if (idx === totalConversions) {
                dispatch(setPoolFundedStatus({'type': 'success', 'message': `Finished creating pool supply and token transfer`}));
              }
              return;

            });
          });
        
      } else {
        return convertibleTokenContract.methods.transfer(bancorConverterAddress, convertibleTokenMinAmount).send({from: senderAddress}, function(err, txHash){
          }).then(function(txSuccess){
              if (idx === totalConversions) {
                dispatch(setPoolFundedStatus({'type': 'success', 'message': `Finished creating pool supply and token transfer`}));
              }
              return;
          });
      }
          
  })
  });
          
}


function getTokenListData(tokenList) {
      const web3 = window.web3;
      
      let tokenDetailList = tokenList.map(function(item){
      const val = item.address;
      const ERC20TokenContract = new web3.eth.Contract(ERC20Token, val);
      if (val && val.length > 0) {
        return  ERC20TokenContract.methods.symbol().call().then(function(tokenSymbol){
          return  axios.get(`https://min-api.cryptocompare.com/data/price?fsym=${tokenSymbol}&tsyms=USD`).then(function(dataResponse){
            let tokenPrice = "";
            if (dataResponse.data && dataResponse.data.USD) {
              tokenPrice = dataResponse.data.USD;
            }
            let returnData = Object.assign({}, item, {'symbol': tokenSymbol, 'price': tokenPrice});
            return returnData;
          })
        });
      } else {
        return null;
      }
      });
      
      return Promise.all(tokenDetailList).then(function(detailListData){
        return detailListData.filter(Boolean);
      });  
}


export default connect(
    mapStateToProps,
    mapDispatchToProps
)(CreateNewPool);