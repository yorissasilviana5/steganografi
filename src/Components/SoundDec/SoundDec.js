import React, { Component } from "react";
// import Select from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./SoundDec.css";
var seedrandom = require('seedrandom');
// import { text } from "@fortawesome/fontawesome-svg-core";

let ExtVigenere = require("../../backend/extendedVigenere");

const truncate = (input) => {
  return (input.length > 10) ? input.substr(0, 9) + '...' : input;
}

// http://stackoverflow.com/questions/962802#962890
function deshuffle(array, seed) {
  var num, tmp, l = array.length;
  var myrng = new seedrandom(seed);
  let seedNum = [];
  for (var i=0; i<array.length; i++) {
    seedNum.push(Math.abs(myrng.int32()));
  }
  console.log(seedNum);
  for (i=array.length-1; i>=0; i--) {
    num = seedNum.pop();
    tmp = array[num % l];
    array[num % l] = array[i];
    array[i] = tmp;
  }
  return array;
}

let fileData = [];
let targetData = [];

let fileReader;

class SoundDec extends Component {
  state = {
    key: "",
    selectedFile: undefined,
    steganoSrc: "",
    soundSrc: "",
    fileType: "",
    fileName: "",
    text: "",
    injectedFile: undefined,
    injectedFileName: "",
    off: 0,
    dataSize: 0
  }

  onKeyChange = (e) => {
    this.setState({ key: e.target.value })
  }

  onTextChange = event => {
    this.setState({ text: event.target.value });
  }

  onInjectedFileNameChange = event => {
    this.setState({ injectedFileName: event.target.value });
  }

  // On file select (from the pop up)
  onFileChange = event => {
    if (event.target.files[0] !== undefined) {
      this.setState({ selectedFile: event.target.files[0]});
      this.setState({ fileName: event.target.files[0].name });
      this.setState({ fileType: event.target.files[0].type });
      if (event.target.files[0] !== undefined) {
        fileReader = new FileReader();
        fileReader.onloadend = this.handleFileRead;
        fileReader.readAsArrayBuffer(event.target.files[0]);
        this.setState({ soundSrc: URL.createObjectURL(event.target.files[0]) });
      }
    }
  }

  handleFileRead = async (e) => {
    const typedArray = new Uint8Array(fileReader.result);

    fileData = [...typedArray];
    
    this.readDataSize(fileData);
  }

  handleDecrypt = async (e) => {
    e.preventDefault();

    var offset = this.state.off

    if (fileData !== []) {
      // Gets each last bit from audio
      let array = [];
      for (var i = 0; i < this.state.dataSize; i++) {
        let bits = "";
        for (var j = 0; j < 8; j++) {
          bits += fileData[offset+(i*8)+j] & 1;
        }
        array.push(parseInt(bits, 2));
      }
      
      // Extract only the text part
      i = 0;
      var type = array[i]; i++;
      let res = "";
      var randomize, tmp = [];

      // Extracts text
      if (type === 0) {
        tmp = [];
        while (i < array.length && array[i] > 1) {
          tmp.push(array[i]);
          i++;
        }
        randomize = array[i];
        console.log(randomize);
        array = tmp;
        console.log(array);

        // Decrypts it
        array = ExtVigenere.decrypt(array, this.state.key);

        // Derandomizes array
        if (randomize === 1) {
          array = deshuffle(array, this.state.key);
          console.log(array);
        }

        i = 0;
        while (i < array.length && array[i] !== 0) {
          res += String.fromCharCode(array[i]);
          i++;
        }
        this.setState({ text: res })
      } 
      // Extracts file
      else if (type === 1) {
        console.log("first byte === 1");
        console.log(array);
        var nLen = 0, fLen = 0;
        var name = "";
        nLen = array[i] + array[i+1]*256 + array[i+2]*256*256 + array[i+3]*256*256*256;
        i = i + 4;
        var dis = i + nLen;
        while (i < dis) {
          name += String.fromCharCode(array[i]);
          i++;
        }
        fLen = array[i] + array[i+1]*256 + array[i+2]*256*256 + array[i+3]*256*256*256;
        i = i + 4;
        tmp = [];
        dis = i + fLen;
        while (i < dis) {
          tmp.push(array[i]);
          i++;
        }

        randomize = array[i];
        console.log(randomize);
        array = tmp;
        console.log(array);

        // Decrypts it
        array = ExtVigenere.decrypt(array, this.state.key);

        // Derandomizes array
        if (randomize === 1) {
          array = deshuffle(array, this.state.key);
          console.log(array);
        }

        // Download file
        targetData = array;
        // const typedArray = new Uint8Array(targetData);
        this.setState({injectedFileName : name});
        console.log(name);
        // this.downloadExtended(typedArray, name);

        document.getElementById("modal-result").style.display = "block";
      } else {
        alert("Not a stego-file!");
      }
    } else {
      alert("No sound file!");
    }
  }

  downloadExtended = async (e) => {
    const typedArray = new Uint8Array(targetData);
    const element = document.createElement("a");
    const file = new Blob([typedArray], {
    });

    element.className = "download-file";
    let url = URL.createObjectURL(file);
    this.setState({ steganoSrc: url })
    element.href = url; 
    element.download = this.state.injectedFileName;
    document.body.appendChild(element);
    element.click();
    element.remove();
  }

  readDataSize = async (dataArray) => {
    let offset = 0;
    var i = 0, found = false;
    while (i < dataArray.length && !found) {
      if (dataArray[i] === 100 && dataArray[i+1] === 97 && dataArray[i+2] === 116 && dataArray[i+3] === 97) {
        found = true;
      };
      i++;
    }
    offset = i+8;
    console.log(offset);
    this.setState({ off: (offset) });
    this.setState({ dataSize: (dataArray.length - (offset)) });
  }

  closeModal() {
    document.getElementById("modal-result").style.display = "none";
  }

  render() {
    return (
      <React.Fragment>
        <div className="wrapper-decrypt">
          <div className="container-decrypt">
            <form className="decrypt-form" onSubmit={this.handleDecrypt}>
              <label>Text</label>
              <textarea className="text-input" placeholder={"Max character: " + (this.state.dataSize/8)} disabled={this.state.dataSize === 0} readOnly
                  type="text" name="text" rows="6" value={this.state.text}/>

              <label>Key</label>
              <input className="key-input" placeholder="Insert vigenere key here" type="text" name="key" onChange={this.onKeyChange} value={this.state.key}/>

              <div className="button-container">
                <input id="file-input" type="file" accept="audio/wav" name="file" className="upload-button" onChange={this.onFileChange} />
                <label htmlFor="file-input">
                  <FontAwesomeIcon icon={this.state.fileName === "" ? "file-upload" : "file"} /> &nbsp; {this.state.fileName === "" ? "Upload" : truncate(this.state.fileName)}
                </label>
                <audio id="src-sound" src={this.state.soundSrc} controls={this.state.soundSrc!==""}></audio>
                <button className="decrypt-button" type="submit">
                  <FontAwesomeIcon icon="lock-open" /> &nbsp; Decrypt
                </button>
              </div>
            </form>
            <form hidden={this.state.injectedFileName === ""} onSubmit={this.downloadExtended}>
                
            </form>
          </div>
        </div>
        <div id="modal-result" className="modal-decrypt">
          <div className="modal-content-container">
            <div className="modal-content">
              <p id="message"><span id="methodResult"></span> Result</p>

              <label>Save extracted file as...</label>
              <input id="iFN-input" placeholder="Name of injected file" type="text" name="injectedFN" onChange={this.onInjectedFileNameChange} value={this.state.injectedFileName}/>

              <div className="button-container">
                <button className="download-button" onClick={this.downloadExtended}>
                  <FontAwesomeIcon icon="download" /> &nbsp; Download
                </button>

                <button className="close-button" onClick={this.closeModal}>
                  <FontAwesomeIcon icon="times-circle" /> &nbsp; Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

export default SoundDec;
