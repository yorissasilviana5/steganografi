import React, { Component } from "react";
// import Select from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./Video.css";
// import { text } from "@fortawesome/fontawesome-svg-core";
// import { randomInt } from "mathjs";

let ExtVigenere = require("../../backend/extendedVigenere");
let string = require('../../backend/util/string')

const truncate = (input) => {
  return (input.length > 10) ? input.substr(0, 9) + '...' : input;
}

// http://stackoverflow.com/questions/962802#962890
function shuffle(array, seed) {
  var tmp, l = array.length;
  let seedNum;
  for (var i=0; i<seed.length; i++) {
    seedNum = seed.charCodeAt(i);
    tmp = array[seedNum % l];
    array[seedNum % l] = array[i % l];
    array[i % l] = tmp;
  }
  return array;
}

let fileData = [];

let URLReader;
let fileReader;

class Video extends Component {
  state = {
    key: "",
    selectedFile: undefined,
    steganoSrc: "",
    videoSrc: "",
    fileType: "",
    fileName: "",
    text: "",
    dataSize: 0,
    randomize: false
  }

  onKeyChange = (e) => {
    this.setState({ key: e.target.value })
  }

  onTextChange = event => {
    this.setState({ text: event.target.value });
  }

  onRandChange = (e) => {
    this.setState({ randomize: !this.state.randomize })
  }

  // On file select (from the pop up)
  onFileChange = event => {
    if (event.target.files[0] !== undefined) {
      this.setState({ selectedFile: event.target.files[0]});
      this.setState({ fileName: event.target.files[0].name });
      this.setState({ fileType: event.target.files[0].type });
      if (event.target.files[0] !== undefined) {
        const src = URL.createObjectURL(event.target.files[0]);
        this.setState({videoSrc: src});
        // console.log(this.state.selectedFile);
        fileReader = new FileReader();
        fileReader.onloadend = this.handleFileRead;
        fileReader.readAsArrayBuffer(event.target.files[0]);
        URLReader = new FileReader();
        URLReader.onloadend = this.handleURLRead;
        URLReader.readAsDataURL(event.target.files[0]);
      }
    }
  }

  handleFileRead = async (e) => {
    // console.log(this.state.fileType)
    // console.log(content)
    const typedArray = new Uint8Array(fileReader.result);
    // console.log(typedArray)

    fileData = [...typedArray];
    // console.log(fileData);
    
    this.readDataSize(fileData);
    
    // const encryptedBuffer = new Uint8Array(encrypted);
    
    // this.downloadExtended(encryptedBuffer);
    // this.setState({ soundSrc: content })
  }

  handleEncrypt = async (e) => {
    e.preventDefault();

    // If message is too long, do nothing
    if (this.state.text.length > this.state.dataSize) {
      alert("Message too long!");
      return;
    }

    // Start steganography
    if (this.state.text !== "" && fileData !== []) {

      // Setup variables
      let array = string.toASCII(this.state.text);
      let endbyte = 0;
      if (this.state.randomize) { 
        endbyte = 1;
      }

      // Encrypts text into array of ASCII
      array = ExtVigenere.encrypt(array, this.state.key);
      
      // Push "end of text" byte
      array.push(endbyte);
      console.log("array: " + array);
      // console.log(array);

      var movi = 0;
      // var offset = 0;
      for (var i=0;i<fileData.length;i++) {
        if (fileData[i] === 109 && fileData[i+1] === 111 && fileData[i+2] === 118 && fileData[i+3] === 105) {
          movi = i;
          // if (movi) {
          //   if (fileData[i] === 0 && fileData[i+1] === 0 && fileData[i+2] === 1) {
          //     offset = i+3;
          //     break;
          //   }
          // }
        }
      }
      console.log(movi);

      // Randomize array
      let seqArray = [];
      for (i = 0; i < array.length; i++) {
        seqArray.push(i);
      }
      // console.log(seqArray);
      if (this.state.randomize) { 
        seqArray = shuffle(seqArray, this.state.key);
      }
      
      // Put each bit into audio
      i = 0;
      // let randbits = "00000000"
      
      // for(var j=0; j<8; j++){
      //   fileData[movi+4+j] &= 254;
      //   // console.log("filedata after 1: " + fileData[movi+4+(i*8)+j]);
      //   fileData[movi+4+j] += parseInt(randbits.charAt(j));
      //   // console.log("filedata after 2: " + fileData[movi+4+(i*8)+j]);
      // }
      while(i < seqArray.length) {
        // console.log("iterasi ke :" +i);
        let bits = array[i].toString(2);
        // console.log("bit before " + bits)
        bits = "00000000".substr(bits.length) + bits;
        // console.log("bit after " + bits)
        for (var j = 0; j < 8; j++) {
          // console.log("filedata before" + fileData[movi+4+(i*8)+j]);
          fileData[movi+4+(seqArray[i]*8)+j] &= 254;
          // console.log("filedata after 1: " + fileData[movi+4+(i*8)+j]);
          fileData[movi+4+(seqArray[i]*8)+j] += parseInt(bits.charAt(j));
          // console.log("filedata after 2: " + fileData[movi+4+(i*8)+j]);
        }
        i++;
      }
      // console.log(fileData);
      // Download audio
      const typedArray = new Uint8Array(fileData);
      this.downloadExtended(typedArray);
    }
  }
  
  handleURLRead = (e) => {
    this.setState({ videoSrc: fileReader.result })
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
    element.download = "Altered-" + this.state.fileName;
    document.body.appendChild(element);
    element.click();
    element.remove();
  }

  readDataSize = async (dataArray) => {
    let max = 0;
    let temp = "";
    for (var i = 7; i >= 4; i--) {
      max = parseInt(dataArray[i]);
      temp += max.toString(16);
    }
    max = (parseInt(temp, 16) + 8)/8;
    // console.log(max);
    this.setState({ dataSize: max });

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
              <textarea id="text-input" placeholder={"Max character: " + this.state.dataSize} disabled={this.state.dataSize === 0}
                type="text" name="text" rows="6" onChange={this.onTextChange} value={this.state.text}/>

              <label>Key</label>
              <input id="key-input" placeholder="Insert vigenere key here" type="text" name="key" onChange={this.onKeyChange} value={this.state.key}/>

              <label>Randomize?</label>
              <input type="checkbox" id="rand-input" name="rand-input" checked={this.state.randomize} onChange={this.onRandChange}/>

              <div className="button-container">
                <input id="file-input" type="file" accept="video/avi" name="file" className="upload-button" onChange={this.onFileChange} />
                <label htmlFor="file-input">
                  <FontAwesomeIcon icon={this.state.fileName === "" ? "file-upload" : "file"} /> &nbsp; {this.state.fileName === "" ? "Upload" : truncate(this.state.fileName)}
                </label>
                {/* <video width="320" height="240" controls>
                  <source src="sample.avi" type="video/avi"/>
                </video> */}
                <button className="encrypt-button" type="submit">
                  <FontAwesomeIcon icon="lock" /> &nbsp; Encrypt
                </button>
                {/* <video width="320" height="240" controls={this.state.steganoSrc!==""}>
                    <source src={this.state.steganoSrc} type="video/avi"></source>
                </video> */}

              </div>
            </form>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

export default Video;
