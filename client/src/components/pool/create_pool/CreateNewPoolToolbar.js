import React, {Component} from 'react';
import {Row, Col} from 'react-bootstrap';

export default class CreateNewPoolToolbar extends Component {
  render() {
    return (
      <div>
            <Row className="toolbar-row">
        <div className="h4 left-align-text">Create new liquidity pool</div>
        </Row>
      </div>
      )
  }
}