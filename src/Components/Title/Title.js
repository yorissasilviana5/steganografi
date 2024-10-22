import React, { Component } from "react";
import logo from "../../logo.png";
import "./Title.css";

class Title extends Component {
  render() {
    return (
      <React.Fragment>
        <div className="wrapper-title">
          <div>
            <img src={logo} className="logo" alt="logo" width="20%" />
          </div>

          <div className="text-title1">SteganoJets</div>

          <div className="text-title2">
            Aplikasi Penyembunyian Pesan Rahasia pada Berkas Citra, Audio, dan
            Video dengan Metode LSB dan BPCS
          </div>
        </div>
      </React.Fragment>
    );
  }
}

export default Title;
