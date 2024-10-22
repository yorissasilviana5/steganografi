import React, { Component } from "react";
import { Link } from "react-router-dom";
import "./NavigationBar.css";

class NavigationBar extends Component {
  render() {
    return (
      <div className="navbar">
        <div className="navbar-wrapper">
          <Link className="navbar-a" to="/title">
            <div className="navbar-button">
              <font color="white">Home</font>
            </div>
          </Link>

          <Link className="navbar-a" to="/sound">
            <div className="navbar-button">
              <font color="white">Audio Encryption</font>
            </div>
          </Link>

          <Link className="navbar-a" to="/sound-dec">
            <div className="navbar-button">
              <font color="white">Audio Decryption</font>
            </div>
          </Link>

          <Link className="navbar-a" to="/video">
            <div className="navbar-button">
              <font color="white">Video Encryption</font>
            </div>
          </Link>

          <Link className="navbar-a" to="/video-dec">
            <div className="navbar-button">
              <font color="white">Video Decryption</font>
            </div>
          </Link>

          
          <Link className="navbar-a" to="/picture">
            <div className="navbar-button">
              <font color="white">Picture</font>
            </div>
          </Link>
        </div>
      </div>
    );
  }
}

export default NavigationBar;
