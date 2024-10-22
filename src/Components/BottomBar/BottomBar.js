import React, { Component } from "react";
import "./BottomBar.css";

class BottomBar extends Component {
  render() {
    return (
      <div className="bottombar">
        <div className="bottombar-wrapper">
          <footer>
            Copyright &copy; 2023 -&nbsp; Yorissa Silviana
            <a className="bottombar-a" href="">
              {" "}
              SteganoJets
            </a>
          </footer>
        </div>
      </div>
    );
  }
}

export default BottomBar;
