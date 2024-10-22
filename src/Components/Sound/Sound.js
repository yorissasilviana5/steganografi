import React, { Component } from "react";
// import Select from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./Sound.css";
var seedrandom = require('seedrandom');
// import { text } from "@fortawesome/fontawesome-svg-core";

let ExtVigenere = require("../../backend/extendedVigenere");
let string = require('../../backend/util/string')

const truncate = (input) => {
  return (input.length > 10) ? input.substr(0, 9) + '...' : input;
}

// http://stackoverflow.com/questions/962802#962890
function shuffle(array, seed) {
  var tmp, l = array.length;
  var myrng = new seedrandom(seed);
  let seedNum;
  for (var i=0; i<array.length; i++) {
    seedNum = Math.abs(myrng.int32());
    tmp = array[seedNum % l];
    array[seedNum % l] = array[i];
    array[i] = tmp;
  }
  return array;
}

let fileData = [];
let targetData = [];

let fileReader;

class Sound extends Component {
  state = {
    key: "",
    steganoName: "",
    selectedFile: undefined,
    steganoSrc: "",
    soundSrc: "",
    fileType: "",
    fileName: "",
    injectedFile: undefined,
    injectedFileName: "",
    text: "",
    off: 0,
    dataSize: 0,
    randomize: false
  }

  onKeyChange = (e) => {
    this.setState({ key: e.target.value })
  }

  onNameChange = (e) => {
    this.setState({ steganoName: e.target.value })
  }

  onTextChange = event => {
    this.setState({ text: event.target.value });
  }

  onRandChange = (e) => {
    this.setState({ randomize: !this.state.randomize })
  }

  // On target select (from the pop up)
  onTargetChange = event => {
    if (event.target.files[0] !== undefined) {
      this.setState({ injectedFile: event.target.files[0] });
      this.setState({ injectedFileName: event.target.files[0].name });
      if (event.target.files[0] !== undefined) {
        fileReader = new FileReader();
        fileReader.onloadend = this.handleTargetRead;
        fileReader.readAsArrayBuffer(event.target.files[0]);
      }
    }
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
    // console.log(this.state.fileType)
    // console.log(content)
    const typedArray = new Uint8Array(fileReader.result);
    // console.log(typedArray)

    fileData = [...typedArray];
    console.log(fileData);
    
    this.readDataSize(fileData);
    
    // const encryptedBuffer = new Uint8Array(encrypted);
    
    // this.downloadExtended(encryptedBuffer);
    // this.setState({ soundSrc: content })
  }

  handleTargetRead = async (e) => {
    const typedArray = new Uint8Array(fileReader.result);
    targetData = [...typedArray];
  }

  handleEncrypt = async (e) => {
    e.preventDefault();
    
    // Start file steganography
    if (this.state.injectedFile !== undefined && this.state.selectedFile !== undefined) {
      let name = this.state.injectedFileName;

      // If message is too long, do nothing
      if (name.length + targetData.length > Math.floor(((this.state.dataSize/8)-10))) {
        alert("File too long!");
        return;
      }

      // Setup variables
      let array = targetData;
      let endbyte = 0;
      let startbyte = 1;
      let offset = this.state.off;
      
      // Randomize array
      if (this.state.randomize) { 
        endbyte = 1;
        array = shuffle(array, this.state.key);
      }

      // Encrypts array
      array = ExtVigenere.encrypt(array, this.state.key);

      // Adds info about name length, name, and file length
      var nLen, fLen, nBytes, fBytes, i = 0;
      nBytes = [0, 0, 0, 0]; nLen = name.length;
      while (nLen > 0 && i < 4) {
        console.log("nLen: " + nLen);
        nBytes[i] += nLen % 256;
        i++; nLen = Math.floor(nLen / 256);
      }
      console.log(nBytes);
      i = 0;
      fBytes = [0, 0, 0, 0]; fLen = array.length;
      while (fLen > 0 && i < 4) {
        console.log("fLen: " + nLen);
        fBytes[i] += fLen % 256;
        i++; fLen = Math.floor(fLen / 256);
      }
      console.log(fBytes);

      var ArrName = string.toASCII(name);
      array = nBytes.concat(ArrName).concat(fBytes).concat(array);
      console.log(array);

      // Push extra bytes
      array.push(endbyte);
      array = [startbyte].concat(array);

      // Put each bit into audio
      for (i = 0; i < array.length; i++) {
        let bits = array[i].toString(2);
        bits = "00000000".substr(bits.length) + bits;
        for (var j = 0; j < 8; j++) {
          fileData[offset+(i*8)+j] &= 254;
          fileData[offset+(i*8)+j] += parseInt(bits.charAt(j));
        }
      }
      
      // Download audio
      const typedArray = new Uint8Array(fileData);
      console.log(typedArray);
      this.downloadExtended(typedArray);
    }
    // Start text steganography
    else if (this.state.text !== "" && this.state.selectedFile !== undefined) {
      // If message is too long, do nothing
      if (this.state.text.length > Math.floor(((this.state.dataSize/8)-2))) {
        alert("Message too long!");
        return;
      }

      // Setup variables
      let array = string.toASCII(this.state.text);
      let endbyte = 0;
      let startbyte = 0;
      let offset = this.state.off;
      
      // Randomize array
      if (this.state.randomize) { 
        endbyte = 1;
        array = shuffle(array, this.state.key);
      }

      // Encrypts text into array of ASCII
      array = ExtVigenere.encrypt(array, this.state.key);
      
      // Push extra bytes
      array.push(endbyte);
      array = [startbyte].concat(array);

      console.log(fileData);
      
      // Put each bit into audio
      for (i = 0; i < array.length; i++) {
        let bits = array[i].toString(2);
        bits = "00000000".substr(bits.length) + bits;
        for (j = 0; j < 8; j++) {
          fileData[offset+(i*8)+j] &= 254;
          fileData[offset+(i*8)+j] += parseInt(bits.charAt(j));
        }
      }
      
      // Download audio
      const typedArray = new Uint8Array(fileData);
      // console.log(typedArray);
      this.downloadExtended(typedArray);
    } else {
      alert("Text is empty or no sound file!");
    }
  }

  downloadExtended = async (content) => {
    const element = document.createElement("a");
    const file = new Blob([content], {
      type: this.state.fileType,
    });

    element.className = "download-file";
    let url = URL.createObjectURL(file);
    this.setState({ steganoSrc: url })
    element.href = url; 
    element.download = this.state.steganoName;
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
        <div className="wrapper-encrypt">
          <div className="container-encrypt">
            <form className="encrypt-form" onSubmit={this.handleEncrypt}>
              <label>Text</label>
              <textarea id="text-input" placeholder={"Max character: " + (Math.floor((this.state.dataSize/8) - 2))} disabled={this.state.dataSize === 0}
                type="text" name="text" rows="6" onChange={this.onTextChange} value={this.state.text}/>

              <input id="target-input" type="file" name="target" className="target-button" onChange={this.onTargetChange} />
              <label htmlFor="target-input">
                <FontAwesomeIcon icon={this.state.injectedFileName === "" ? "file-upload" : "file"} /> &nbsp; {this.state.injectedFileName === "" ? "Target" : truncate(this.state.injectedFileName)}
              </label>

              <label>Key</label>
              <input id="key-input" placeholder="Insert vigenere key here" type="text" name="key" onChange={this.onKeyChange} value={this.state.key}/>

              <label>Save As...</label>
              <input id="key-input" placeholder="something.wav" type="text" name="key" onChange={this.onNameChange} value={this.state.steganoName}/>

              <label>Randomize?</label>
              <input type="checkbox" id="rand-input" name="rand-input" checked={this.state.randomize} onChange={this.onRandChange}/>

              <div className="button-container">
                <input id="file-input" type="file" accept="audio/wav" name="file" className="upload-button" onChange={this.onFileChange} />
                <label htmlFor="file-input">
                  <FontAwesomeIcon icon={this.state.fileName === "" ? "file-upload" : "file"} /> &nbsp; {this.state.fileName === "" ? "Upload" : truncate(this.state.fileName)}
                </label>
                <audio id="src-sound" src={this.state.soundSrc} controls={this.state.soundSrc!==""}></audio>
                <button className="encrypt-button" type="submit">
                  <FontAwesomeIcon icon="lock" /> &nbsp; Encrypt
                </button>
                <audio id="stegano-sound" src={this.state.steganoSrc} controls={this.state.steganoSrc!==""}></audio>

              </div>
            </form>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

export default Sound;
