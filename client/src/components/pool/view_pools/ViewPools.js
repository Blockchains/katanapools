import React, {Component} from 'react';
import ViewPoolToolbar from './ViewPoolToolbar';
import { faArrowLeft, faArrowRight,  faChevronCircleDown, faSpinner } from '@fortawesome/free-solid-svg-icons';
import {ListGroupItem, ListGroup, Row, Col, Button} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import SelectedPool from './SelectedPool';
import {isNonEmptyObject} from '../../../utils/ObjectUtils';

export default class ViewPool extends Component {
  render() {
    return (
      <div>
        <ViewPoolToolbar/>
        <ViewPoolWidget {...this.props}/>
      </div>
      )
  }
}

class ViewPoolWidget extends Component {
  
  setSelectedPool (selectedPool) {
    console.log(selectedPool);
    this.props.getPoolDetails(selectedPool);
  }
  render() {
    const {poolData, pool: {currentSelectedPool}} = this.props;
    const self = this;
    let poolDataList = <span/>;
    
    if (poolData.length === 0) {
      poolDataList =  <FontAwesomeIcon icon={faSpinner} size="lg" rotation={270} pulse/>
    } else {
      poolDataList = <ListGroup>
        <ListGroupItem>
              Symbol
        </ListGroupItem>
       {
         poolData.map(function(poolRow){
           return <ListGroupItem onClick={self.setSelectedPool.bind(self, poolRow)}>

              {poolRow.symbol}

           </ListGroupItem>
         })
       }
      </ListGroup>
    }
    let selectedPool = <span/>;
    if (isNonEmptyObject(currentSelectedPool)) {
      selectedPool =  <SelectedPool {...this.props}/>
    }
    return (
      <div className="app-toolbar-container ">
        
        <Row>
        <Col lg={2}>
        {poolDataList}
        </Col>
        <Col lg={10}>
          {selectedPool}
        </Col>
        </Row>
      </div>
      )
  }
}