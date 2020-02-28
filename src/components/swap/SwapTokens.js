import React, {Component} from 'react';
import { Row, Col, Button, Form} from 'react-bootstrap';
import './swapToken.scss';
import SwapTokenToolbar from './SwapTokenToolbar';
import SwapTokenWidget from './SwapTokenWidget';


var RegistryUtils = require('../../utils/RegistryUtils');

export default class SwapToken extends Component {
  constructor(props) {
    super(props);
    this.state = {smartTokenCheck: false, convertibleTokenCheck: true, transferAmount: 1,
            receiveAmount: 0, totalFee: 0, transactionFee: 0,
          tokenData: [],
    };
    
  }
  
  componentWillMount() {
    const {smartTokenCheck, convertibleTokenCheck} = this.state;
    this.fetchTokenList(smartTokenCheck, convertibleTokenCheck);
    
  }
  
  fetchTokenList = (smartTokenCheck, convertibleTokenCheck) => {
    const self = this;
      let fetchTokenFlag = "convertibletokens";
      if (smartTokenCheck && convertibleTokenCheck) {
        fetchTokenFlag = "alltokens";
      }
      else if (smartTokenCheck && !convertibleTokenCheck) {
        fetchTokenFlag = "smarttokens";
      }
      else if (!smartTokenCheck && convertibleTokenCheck) {
        fetchTokenFlag = "convertibletokens";
      } else {
        fetchTokenFlag = "notokens";
      }

      const transferAmount = this.state.transferAmount;  
      RegistryUtils.getConverterRegistryAddress().then(function(convertibleTokenAddress){
 
      RegistryUtils.getTokenList( convertibleTokenAddress, fetchTokenFlag).then(function(tokenList){
      RegistryUtils.getTokenData( tokenList, fetchTokenFlag).then(function(tokenDataResponse){
        if (tokenDataResponse && tokenDataResponse.length > 0){
        const initialFromToken = tokenDataResponse[0];
        const initialToToken = tokenDataResponse[1];
        self.setState({tokenData: tokenDataResponse, selectedTransferToken: initialFromToken, selectedReceiveToken: initialToToken });
        }
      });
    });
  });
}
  
  refetchTokenList = (smartTokenCheck, convertibleTokenCheck) => {
    this.fetchTokenList(smartTokenCheck, convertibleTokenCheck);
  }
  render() {
    return (
      <div className="swap-token-app">
 
        <SwapTokenToolbar refetchTokenList={this.refetchTokenList}/>
  
        <SwapTokenWidget {...this.state}/>
  
      </div>
      )
  }
}