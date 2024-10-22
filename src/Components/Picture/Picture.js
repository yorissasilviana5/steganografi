import React, { Component } from "react";
// import Select from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./Picture.css";
import { compareDependencies } from "mathjs";
// import { parse } from "mathjs";
// import { text } from "@fortawesome/fontawesome-svg-core";
// import { randomInt } from "mathjs";

let ExtVigenere = require("../../backend/extendedVigenere");

const truncate = (input) => {
  return (input.length > 10) ? input.substr(0, 9) + '...' : input;
}

var seedrandom = require('seedrandom')

let fileData = [];
// Buffer for file message
let targetData = [];

let URLReader;
let fileReader;




var CanvasToBMP = {

  /**
   * Convert a canvas element to ArrayBuffer containing a BMP file
   * with support for 32-bit (alpha).
   *
   * Note that CORS requirement must be fulfilled.
   *
   * @param {HTMLCanvasElement} canvas - the canvas element to convert
   * @return {ArrayBuffer}
   */
  toArrayBuffer: function(canvas) {

    var w = canvas.width,
        h = canvas.height,
        w4 = w * 4,
        idata = canvas.getContext("2d").getImageData(0, 0, w, h),
        data32 = new Uint32Array(idata.data.buffer), // 32-bit representation of canvas

        stride = Math.floor((32 * w + 31) / 32) * 4, // row length incl. padding
        pixelArraySize = stride * h,                 // total bitmap size
        fileLength = 122 + pixelArraySize,           // header size is known + bitmap

        file = new ArrayBuffer(fileLength),          // raw byte buffer (returned)
        view = new DataView(file),                   // handle endian, reg. width etc.
        pos = 0, x, y = 0, p, s = 0, a, v;

    // write file header
    setU16(0x4d42);          // BM
    setU32(fileLength);      // total length
    pos += 4;                // skip unused fields
    setU32(0x7a);            // offset to pixels

    // DIB header
    setU32(108);             // header size
    setU32(w);
    setU32(-h >>> 0);        // negative = top-to-bottom
    setU16(1);               // 1 plane
    setU16(32);              // 32-bits (RGBA)
    setU32(3);               // no compression (BI_BITFIELDS, 3)
    setU32(pixelArraySize);  // bitmap size incl. padding (stride x height)
    setU32(2835);            // pixels/meter h (~72 DPI x 39.3701 inch/m)
    setU32(2835);            // pixels/meter v
    pos += 8;                // skip color/important colors
    setU32(0xff0000);        // red channel mask
    setU32(0xff00);          // green channel mask
    setU32(0xff);            // blue channel mask
    setU32(0xff000000);      // alpha channel mask
    setU32(0x57696e20);      // " win" color space

    // bitmap data, change order of ABGR to BGRA
    while (y < h) {
      p = 0x7a + y * stride; // offset + stride x height
      x = 0;
      while (x < w4) {
        v = data32[s++];                     // get ABGR
        a = v >>> 24;                        // alpha channel
        view.setUint32(p + x, (v << 8) | a); // set BGRA
        x += 4;
      }
      y++
    }

    return file;

    // helper method to move current buffer position
    function setU16(data) {view.setUint16(pos, data, true); pos += 2}
    function setU32(data) {view.setUint32(pos, data, true); pos += 4}
  },

  /**
   * Converts a canvas to BMP file, returns a Blob representing the
   * file. This can be used with URL.createObjectURL().
   * Note that CORS requirement must be fulfilled.
   *
   * @param {HTMLCanvasElement} canvas - the canvas element to convert
   * @return {Blob}
   */
  toBlob: function(canvas) {
    return new Blob([this.toArrayBuffer(canvas)], {
      type: "image/bmp"
    });
  },

  /**
   * Converts the canvas to a data-URI representing a BMP file.
   * Note that CORS requirement must be fulfilled.
   *
   * @param canvas
   * @return {string}
   */
  toDataURL: function(canvas) {
    var buffer = new Uint8Array(this.toArrayBuffer(canvas)),
        bs = "", i = 0, l = buffer.length;
    while (i < l) bs += String.fromCharCode(buffer[i++]);
    return "data:image/bmp;base64," + btoa(bs);
  }
};



class Picture extends Component {
  state = {
    key: "",
    steganoName: "",
    selectedFile: undefined,
    steganoSrc: "",
    pictureSrc: "",
    fileType: "",
    fileName: "",
    injectedFile: undefined,
    injectedFileName: "",
    injectedFileType: "",
    text: "",
    dataSize: 0,
    extension: "",
    randomize: false,
    bpcs: false
  }

  onKeyChange = (e) => {
    this.setState({ key: e.target.value })
  }

  onTextChange = event => {
    this.setState({ text: event.target.value });
  }

  onNameChange = (e) => {
    this.setState({ steganoName: e.target.value })
  }

  onRandChange = (e) => {
    this.setState({ randomize: !this.state.randomize })
  }

  onBPCSChange = (e) => {
    this.setState({ bpcs: !this.state.bpcs })
  }

  onInjectedFileNameChange = event => {
    this.setState({ injectedFileName: event.target.value });
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

  findAmplifiedMinified = (x,max) => {
    if (x < max/2){
      return x + Math.floor(max/2)
      }	else {  
      return x - Math.floor(max/2)
      }
  }

  checkerBoardMake = () => {
    let checkerBoard = []
    for (let i = 0; i < 64; i++){
      if (i % 2 === 0){
        checkerBoard.push("0")
      }else{
        checkerBoard.push("1")
      }
    }
    return checkerBoard
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
    console.log(typedArray)

    fileData = [...typedArray];
    this.readDataSize(fileData);

    // const encryptedBuffer = new Uint8Array(encrypted);
    
    // this.downloadExtended(encryptedBuffer);
    // this.setState({ soundSrc: content })
  }

  handleTargetRead = async (e) => {
    const typedArray = new Uint8Array(fileReader.result);
    targetData = [...typedArray];
  }

  constructBitMap = (ctx, width, height) => {
    let bitMap = []
    //let chunks = Math.ceil((width*height*24)/64)
    for (let i = 0; i < 24; i++){
      bitMap.push([])
    }
    
    let x = 0

    for (let i = 0; i < height; i++){
      for (let j = 0; j < width; j++){
        let imgData = ctx.getImageData(j,i,1,1)
        let bitR = imgData.data[0].toString(2)
        bitR = "00000000".substr(bitR.length) + bitR;

        let bitG = imgData.data[1].toString(2)
        bitG = "00000000".substr(bitG.length) + bitG;

        let bitB = imgData.data[2].toString(2)
        bitB = "00000000".substr(bitB.length) + bitB; 
        
        let bitTot = bitR+bitG+bitB
        if (bitMap[x*24].length === 64){
          for (let i = 0; i < 24; i++){
            bitMap.push([])
          }
          x += 1
        }
        for (let k = 0; k < 24; k++){
          bitMap[(x*24)+k].push(bitTot[k])
        }
      }
    }
    // for (let i = 0; i < bitMap.length; i++){
    //   if (bitMap[i].length < 64){
    //     for (let j = 0; j < 64-bitMap[i].length; j++){
    //       bitMap[i].push("0")
    //     }
    //   }
    // }
    // for (let i = 0; i < bitMap.length; i++){
    //   for (let j = 63; j > 0; j--){
    //     bitMap[i][j] ^= bitMap[i][j-1]
    //   }
    // }
    return bitMap
  }

  evaluateComplexity = (arrayOfBits) => {
    let Mat = []
    for (let k = 0; k < 8; k++){
      Mat.push([])
    }

    let x = 0
    for (let l = 0; l < arrayOfBits.length; l++){
      if (Mat[x].length === 8){
        x += 1
      }
      Mat[x].push(arrayOfBits[l])
    }

    let sum1 = 0 
    let sum2 = 0
    for (let k = 0; k < 7; k++){
      for (let l = 0; l < 7; l++){
        if (Mat[k][l] !== Mat[k][l+1]){
          sum1 += 1
        }

        if (Mat[l][k] !== Mat[l+1][k]){
          sum2 += 1
        }

      }
    }
    let sumTot = sum1*2 + sum2*2
    return sumTot/112
  } 

  analyzeAndHide = (bitMap, message, ordered, seed = null) => {
    // let threshold = 0.3
    let j = 0
    let s = 0
    let chunk = 0 

    let checkerBoard = this.checkerBoardMake()
    let rng = seedrandom(String.toString(seed))

    console.log(ordered)
    for (let i = 0; i < message.length; i += 8){
      if (ordered){
        while (j < bitMap.length) {
          if (this.evaluateComplexity(bitMap[j]) > 0.3){
            console.log("in")
            let limit = 8 > (message.length-(chunk*8)) ? (message.length-(chunk*8)) : 8
            for (let p = 0; p < limit; p++){
              let bits = message[chunk*8+p].toString(2)
              bits = "00000000".substr(bits.length) + bits;
              for (let q = 0; q < 8; q++){
                bitMap[j][(8*p)+q] = bits[q]
              }
            }
            console.log(bitMap[j])
            j += 1
            chunk += 1
            if (this.evaluateComplexity(bitMap[j]) < 0.3) {
              let conj = this.findAmplifiedMinified(j, bitMap.length-1)
              for (let o = 0; o < 64; o++){
                bitMap[j][o] ^= checkerBoard[o]
                bitMap[conj][o] = bitMap[j][o]
              }
            }
            break          
          }
          j += 1

        }
      } else if (!ordered){
        
        let filled = []
        let row = Math.round(rng() * (Math.floor(bitMap.length/2)))
        if (row in filled){
          row = Math.round(rng() * (Math.floor(bitMap.length/2)))
        }
        filled.push(row)
        let limit = 8 > (message.length-(chunk*8)) ? (message.length-(chunk*8)) : 8
        for (let p = 0; p < limit; p++){
          let bits = message[chunk*8+p].toString(2)
          bits = "00000000".substr(bits.length) + bits;
          for (let q = 0; q < 8; q++){
            bitMap[row][(8*p)+q] = bits[q]
          }
        }
        chunk += 1
        if (this.evaluateComplexity(bitMap[row]) < 0.3) {
          let conj = this.findAmplifiedMinified(row, bitMap.length-1)
          for (let o = 0; o < 64; o++){
            bitMap[row][o] ^= checkerBoard[o]
            bitMap[conj][o] = bitMap[row][o]
          }
        }
      }
    }
    console.log(s)
    // for (let i = 0; i < bitMap.length; i++){
    //   for (let j = 0; j > 64; j--){
    //     bitMap[i][j] ^= bitMap[i][j+1]
    //   }
    // }
    return bitMap
  }

  assembleResult = (c, bitMap, width, height) => {
    const {fileType} = this.state
    let iters = bitMap.length/24
    // let count = 0
    let x = 0 
    let y = 0
    let ctx = c.getContext("2d")
    // let bmp = this.constructBitMap(ctx, c.width, c.height)

    for (let i = 0; i < iters; i++){
      
      for (let j = 0; j < bitMap[i].length; j++){
        let r = ""
        let g = ""
        let b = ""
        
        for (let k = 0; k < 24; k++){

          if (r.length !== 8){
            r += bitMap[i*24+k][j]
          } else {

            if (g.length !== 8){
              g += bitMap[i*24+k][j]
            } else {
              if (b.length !== 8){
                b += bitMap[i*24+k][j]
              }
            }
          }     

        }

        r = parseInt(r,2)
        g = parseInt(g,2)
        b = parseInt(b,2)
  
        let imgData = ctx.getImageData(x,y,1,1)
        imgData.data[0] = r
        imgData.data[1] = g
        imgData.data[2] = b
        ctx.putImageData(imgData, x, y)
        if (x >= width-1){
          x = 0
          y += 1
        } else {
          x += 1
        }
        
      }
      
    }  

    let dest = document.getElementById('stegano-picture')
    let img = document.getElementById('src-picture')
    let c2 = document.createElement('canvas')
    let bit = this.constructBitMap(ctx, width, height)
    let ctx3 = c2.getContext("2d")
    ctx3.drawImage(img,0,0)
    console.log(ctx3.getImageData(0,0,c.width,c.height))
    if (fileType === "image/bmp"){
       let bmpBlob = CanvasToBMP.toBlob(c)
       dest.src = URL.createObjectURL(bmpBlob)
    }else{
      dest.src = c.toDataURL(fileType)
    }
    let ctx2 = c.getContext("2d")
    console.log(ctx2.getImageData(0,0,c.width,c.height)) 
  }


  handleEncrypt = async (e) => {
    e.preventDefault();
    const {fileType} = this.state

    // If message is file
    if (targetData !== [] && fileData !== []) {
      let array = targetData;
      array = ExtVigenere.encrypt(array, this.state.key);
      let txt = "";
      txt += "()"
      txt += this.state.injectedFileType
      txt += "{}"
      // let ordered = !this.state.randomize
      let seed = 0
      for (let i = 0; i < this.state.key.length; i++) {
        seed += this.state.key.charCodeAt(i);
      }
      
      console.log(txt)
      for (let i = 0; i < txt.length; i++) {
        array.push(txt.charCodeAt(i));
      }
      console.log(txt)
      console.log(array);
      let img = document.getElementById('src-picture')
      let c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      console.log(img.width)
      console.log(img.height)
      let ctx = c.getContext("2d")
      ctx.drawImage(img,0,0)
      
      // Stegano BPCS     
      if (this.state.bpcs){
        let bitMap = this.constructBitMap(ctx, c.width, c.height)
        bitMap = this.analyzeAndHide(bitMap, array, !this.state.randomize, seed)
        this.assembleResult(c, bitMap, c.width, c.height)
      }else{
      // Stegano LSB
      let x = 0
      let y = 0
      if (!this.state.randomize){
        for (let i = 0; i < array.length; i++){
          let bits = array[i].toString(2)
          bits = "00000000".substr(bits.length) + bits;
          for (let j = 0; j < 8; j+=3){
            if (x === img.width){
              y += 1
              x = 0
            }
            let imgData = ctx.getImageData(x,y,1,1)
            imgData.data[0] &= 254
            imgData.data[1] &= 254
            if (bits[j+2] !== undefined){
              imgData.data[2] &= 254
              imgData.data[2] += parseInt(bits.charAt(j+2))
            }
            imgData.data[1] += parseInt(bits.charAt(j+1))
            imgData.data[0] += parseInt(bits.charAt(j))
            ctx.putImageData(imgData, x, y)
            x += 1
          }
        }
      } else if (this.state.randomize){
        let listX = []
        let listY = []
        let rng = seedrandom(String.toString(seed))
        for (let i = 0; i < array.length; i++){
          let bits = array[i].toString(2)
          bits = "00000000".substr(bits.length) + bits;
          for (let j = 0; j < 8; j+=3){
            let y = Math.round(rng() * (Math.floor(c.height-1)))
            let x = Math.round(rng() * (Math.floor(c.width-1)))
            listX.push(x)
            listY.push(y)
            if (x in listX && y in listY){
              y = Math.round(rng() * (Math.floor(c.height-1)))
              x = Math.round(rng() * (Math.floor(c.width-1)))
            }
            let imgData = ctx.getImageData(x,y,1,1)
            imgData.data[0] &= 254
            imgData.data[1] &= 254
            if (bits[j+2] !== undefined){
              imgData.data[2] &= 254
              imgData.data[2] += parseInt(bits.charAt(j+2))
            }
            imgData.data[1] += parseInt(bits.charAt(j+1))
            imgData.data[0] += parseInt(bits.charAt(j))
            ctx.putImageData(imgData, x, y)
            x += 1
          }
        }
      }
      let dest = document.getElementById('stegano-picture')
      dest.src = c.toDataURL(fileType)
      }

      let imgOld = document.getElementById('src-picture')
      let cOld = document.createElement('canvas')
      let ctxOld = cOld.getContext("2d")
      ctxOld.drawImage(imgOld,0,0)
      let sumTotal = 0
      for (let i = 0; i < img.height; i++){
        for (let j = 0; j < img.width; j++){
          let imgData1 = ctxOld.getImageData(j,i,1,1)
          let imgData2 = ctx.getImageData(j,i,1,1)
          for (let k = 0; k < 3; k++){
            sumTotal += Math.pow((imgData1.data[k] - imgData2.data[k]), 2)
          }
        }
      }
      console.log(sumTotal)
      sumTotal /= (img.width*img.height)


      let psnr = 20 * Math.log10(255/Math.sqrt(sumTotal))
      console.log(psnr)
    }
    // If message is text
    else if (this.state.text !== "" && fileData !== []) {
      let array = [];
      this.state.text += "()"
      this.state.text += this.state.injectedFileType
      this.state.text += "{}"
      // let ordered = false
      let seed = 10
      
      console.log(this.state.text)
      for (var i = 0; i < this.state.text.length; i++) {
        array.push(this.state.text.charCodeAt(i));
      }
      console.log(this.state.text)
      console.log(array);
      let img = document.getElementById('src-picture')
      let c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      console.log(img.width)
      console.log(img.height)
      let ctx = c.getContext("2d")
      ctx.drawImage(img,0,0)
      
      // Stegano BPCS     
      if (this.state.bpcs){
        let bitMap = this.constructBitMap(ctx, c.width, c.height)
        bitMap = this.analyzeAndHide(bitMap, array, !this.state.randomize, seed)
        this.assembleResult(c, bitMap, c.width, c.height)
      }else{



      // Stegano LSB
      let x = 0
      let y = 0
      if (!this.state.randomize){
        for (let i = 0; i < array.length; i++){
          let bits = array[i].toString(2)
          bits = "00000000".substr(bits.length) + bits;
          for (let j = 0; j < 8; j+=3){
            if (x === img.width){
              y += 1
              x = 0
            }
            let imgData = ctx.getImageData(x,y,1,1)
            imgData.data[0] &= 254
            imgData.data[1] &= 254
            if (bits[j+2] !== undefined){
              imgData.data[2] &= 254
              imgData.data[2] += parseInt(bits.charAt(j+2))
            }
            imgData.data[1] += parseInt(bits.charAt(j+1))
            imgData.data[0] += parseInt(bits.charAt(j))
            ctx.putImageData(imgData, x, y)
            x += 1
          }
        }
      } else if (this.state.randomize){
        let listX = []
        let listY = []
        let rng = seedrandom(String.toString(seed))
        for (let i = 0; i < array.length; i++){
          let bits = array[i].toString(2)
          bits = "00000000".substr(bits.length) + bits;
          for (let j = 0; j < 8; j+=3){
            let y = Math.round(rng() * (Math.floor(c.height-1)))
            let x = Math.round(rng() * (Math.floor(c.width-1)))
            listX.push(x)
            listY.push(y)
            if (x in listX && y in listY){
              y = Math.round(rng() * (Math.floor(c.height-1)))
              x = Math.round(rng() * (Math.floor(c.width-1)))
            }
            let imgData = ctx.getImageData(x,y,1,1)
            imgData.data[0] &= 254
            imgData.data[1] &= 254
            if (bits[j+2] !== undefined){
              imgData.data[2] &= 254
              imgData.data[2] += parseInt(bits.charAt(j+2))
            }
            imgData.data[1] += parseInt(bits.charAt(j+1))
            imgData.data[0] += parseInt(bits.charAt(j))
            ctx.putImageData(imgData, x, y)
            x += 1
          }
        }
      }
      let dest = document.getElementById('stegano-picture')
      dest.src = c.toDataURL(fileType)

      }

      let imgOld = document.getElementById('src-picture')
      let cOld = document.createElement('canvas')
      let ctxOld = cOld.getContext("2d")
      ctxOld.drawImage(imgOld,0,0)
      let sumTotal = 0
      for (let i = 0; i < img.height; i++){
        for (let j = 0; j < img.width; j++){
          let imgData1 = ctxOld.getImageData(j,i,1,1)
          let imgData2 = ctx.getImageData(j,i,1,1)
          for (let k = 0; k < 3; k++){
            sumTotal += Math.pow((imgData1.data[k] - imgData2.data[k]), 2)
          }
        }
      }
      console.log(sumTotal)
      sumTotal /= (img.width*img.height*3)


      let psnr = 20 * Math.log10(255/Math.sqrt(sumTotal))
      console.log(psnr)

      
    } else {
      alert("Text is empty or no picture file!");
    }
  }

  handleDecrypt = async (e) => {
    e.preventDefault();

    if (fileData !== []) {
      // let array = [];
      let img = document.getElementById('src-picture')
      let c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      let ctx = c.getContext("2d")
      ctx.drawImage(img,0,0)
      let result = ""

      let seed = 0
      for (var i = 0; i < this.state.key.length; i++) {
        seed += this.state.key.charCodeAt(i);
      }
      // Decrypt BPCS
      if (this.state.bpcs){
        if (!this.state.randomize){
          let bitMap = this.constructBitMap(ctx, c.width, c.height)
          let temp = ""
          let checkerBoard = this.checkerBoardMake()
          for (let i = 0; i < bitMap.length; i++){
            
            if (this.evaluateComplexity(bitMap[i]) > 0.3){
              let flagXORed = true
              let amp = this.findAmplifiedMinified(i, bitMap.length-1)
              for (let k = 0; k < 64; k++){
                if (bitMap[i][k] !== bitMap[amp][k]){
                  flagXORed = false
                }            
              }
              
              if (flagXORed){
                for (let k = 0; k < 64; k++){
                  bitMap[i][k] ^= checkerBoard[k]
                }
              }

              for (let j = 0; j < bitMap[i].length; j++){
                if (result[result.length-1] === '}' && result[result.length-2] === '{'){
                  break
                }
                temp += bitMap[i][j]
                if (temp.length === 8){
                  let res = parseInt(temp,2)
                  result += String.fromCharCode(res)
                  temp = ""
                }
                
              }
              if (result[result.length-1] === '}' && result[result.length-2] === '{'){
                result = result.substring(0, result.length - 2)
                break
              }
            }     
          }
          console.log(result)
        } else if (this.state.randomize){
          let rng = seedrandom(String.toString(seed))
          while(1){
            
            let bitMap = this.constructBitMap(ctx, c.width, c.height)
            let temp = ""
            let checkerBoard = this.checkerBoardMake()
            
            let filled = []
            let row = Math.round(rng() * (Math.floor(bitMap.length/2)))
            if (row in filled){
              row = Math.round(rng() * (Math.floor(bitMap.length/2)))
            }
            filled.push(row)
            let flagXORed = true
            let amp = this.findAmplifiedMinified(row, bitMap.length-1)
            for (let k = 0; k < 64; k++){
              if (bitMap[row][k] !== bitMap[amp][k]){
                flagXORed = false
              }            
            }
            
            if (flagXORed){
              for (let k = 0; k < 64; k++){
                bitMap[row][k] ^= checkerBoard[k]
              }
            }

            for (let j = 0; j < bitMap[row].length; j++){
              if (result[result.length-1] === '}' && result[result.length-2] === '{'){
                break
              }
              temp += bitMap[row][j]
              if (temp.length === 8){
                let res = parseInt(temp,2)
                result += String.fromCharCode(res)
                temp = ""
              }
            }
            if (result[result.length-1] === '}' && result[result.length-2] === '{'){
              result = result.substring(0, result.length - 2);
              break
            }
          }
          console.log(result)
        }
        let ext = ""
        for (let i = result.length-1; i > 0; i--){
          if (result[i] === ")"){
            console.log(i-1)
            result = result.substring(0, i-1);
            break
          }
          ext += result[i]        
        }
        targetData = [];
        for (let i = 0; i < result.length; i++) {
          targetData.push(result.charCodeAt(i));
        }
        targetData = ExtVigenere.decrypt(targetData, this.state.key);
        
        
        console.log(result)
        ext = ext.split("")
        ext = ext.reverse()
        ext = ext.join("")
        console.log(ext)
        this.setState({
          injectedFileType:ext
        })
        document.getElementById("modal-result").style.display = "block";
      }else{
        //Decrypt LSB
        let im = ctx.getImageData(0,0,c.width,c.height)
        console.log(im)
        let bits = "";
        let text = ""
        if (!this.state.randomize){
          for (let i = 0; i < img.height; i++){
            for (let j = 0; j < img.width; j++){
              if (text[text.length-1] === '}' && text[text.length-2] === '{'){
                break
              }
              let imgData = ctx.getImageData(j,i,1,1)
              
              bits += imgData.data[0] & 1;
              bits += imgData.data[1] & 1;

              if (bits.length + 1 < 8){
                bits += imgData.data[2] & 1;
              }
              if (bits.length >= 8){
                let res = (parseInt(bits,2))
                text += String.fromCharCode(res)
                bits = ""
              }
      
            }
            if (text[text.length-1] === '}' && text[text.length-2] === '{'){
              text = text.substring(0, text.length - 2);
              break
            }
          }
        } else if (this.state.randomize){
          let rng = seedrandom(String.toString(seed))
          let listX = []
          let listY = []
          while(1){
            if (text[text.length-1] === '}' && text[text.length-2] === '{'){
              text = text.substring(0, text.length - 2);
              break
            }
            let y = Math.round(rng() * (Math.floor(c.height-1)))
            let x = Math.round(rng() * (Math.floor(c.width-1)))
            listX.push(x)
            listY.push(y)
            if (x in listX && y in listY){
              y = Math.round(rng() * (Math.floor(c.height-1)))
              x = Math.round(rng() * (Math.floor(c.width-1)))
            }
            
            let imgData = ctx.getImageData(x,y,1,1)
              
              bits += imgData.data[0] & 1;
              bits += imgData.data[1] & 1;

              if (bits.length + 1 < 8){
                bits += imgData.data[2] & 1;
              }
              if (bits.length >= 8){
                let res = (parseInt(bits,2))
                text += String.fromCharCode(res)
                bits = ""
              }
          }
        }
        console.log(text)
        let ext = ""
        for (let i = text.length-1; i > 0; i--){
          if (text[i] === ")"){
            console.log(i-1)
            text = text.substring(0, i-1);
            break
          }
          ext += text[i]        
        }
        targetData = [];
        for (let i = 0; i < text.length; i++) {
          targetData.push(text.charCodeAt(i));
        }
        targetData = ExtVigenere.decrypt(targetData, this.state.key);
        console.log(text)
        ext = ext.split("")
        ext = ext.reverse()
        ext = ext.join("")
        console.log(ext)
        this.setState({
          injectedFileType:ext
        })
        } 
        document.getElementById("modal-result").style.display = "block";
    } else {
      alert("No paint file!");
    }
  }
  
  handleURLRead = (e) => {
    const {fileType} = this.state
    const typedArray = new Uint8Array(fileReader.result);
    const blob = new Blob([typedArray],{ type:fileType})
    const urlCreator = window.URL || window.webkitURL
    const imageUrl = urlCreator.createObjectURL(blob)
    this.setState({ pictureSrc: imageUrl })
  }

  downloadExtended = async (content) => {
    const typedArray = new Uint8Array(targetData);
    const element = document.createElement("a");
    const file = new Blob([typedArray], {
      type: this.state.injectedFileType,
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
    let max = 0;
    for (var i = 43; i >= 40; i--) {
      max = max * 256;
      max += dataArray[i];
      console.log(max)
    }
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
              <textarea id="text-input" placeholder={"Max character: " + (this.state.dataSize/8)} disabled={this.state.dataSize === 0}
                type="text" name="text" rows="4" onChange={this.onTextChange} value={this.state.text}/>

              <input id="target-input" type="file" name="target" className="target-button" onChange={this.onTargetChange} />
              <label htmlFor="target-input">
                <FontAwesomeIcon icon={this.state.injectedFileName === "" ? "file-upload" : "file"} /> &nbsp; {this.state.injectedFileName === "" ? "Target" : truncate(this.state.injectedFileName)}
              </label>

              <label>Key</label>
              <input className="key-input" placeholder="Insert vigenere key here" type="text" name="key" onChange={this.onKeyChange} value={this.state.key}/>

              <label>Save As...</label>
              <input className="key-input" placeholder="something.wav" type="text" name="key" onChange={this.onNameChange} value={this.state.steganoName}/>

              <label>Randomize?</label>
              <input type="checkbox" id="rand-input" name="rand-input" checked={this.state.randomize} onChange={this.onRandChange}/>

              <label>BPCS?</label>
              <input type="checkbox" id="bpcs-input" name="bpcs-input" checked={this.state.bpcs} onChange={this.onBPCSChange}/>

              <div className="button-container">
                <input id="file-input" type="file" accept="image/bmp,image/png" name="file" className="upload-button" onChange={this.onFileChange} />
                <label htmlFor="file-input">
                  <FontAwesomeIcon icon={this.state.fileName === "" ? "file-upload" : "file"} /> &nbsp; {this.state.fileName === "" ? "Upload" : truncate(this.state.fileName)}
                </label>
                <img id="src-picture" alt={this.state.fileName} src={this.state.pictureSrc}></img>
                <button className="encrypt-button" type="submit">
                  <FontAwesomeIcon icon="lock" /> &nbsp; Encrypt
                </button>
                <img id="stegano-picture" alt={this.state.steganoName} src={this.state.steganoSrc}></img>
              </div>
              {/* <button onClick={this.handleDecrypt}>HELP</button> */}
            </form>
            <form className="encrypt-form" onSubmit={this.handleDecrypt}>
              <div className="button-container">
                <input id="file-input" type="file" accept="image/bmp,image/png" name="file" className="upload-button" onChange={this.onFileChange} />
                <label htmlFor="file-input">
                  <FontAwesomeIcon icon={this.state.fileName === "" ? "file-upload" : "file"} /> &nbsp; {this.state.fileName === "" ? "Upload" : truncate(this.state.fileName)}
                </label>
                {/* <img id="src-picture" alt={this.state.fileName} src={this.state.pictureSrc} width="200px" height="200px"></img> */}
                <button className="encrypt-button" type="submit">
                  <FontAwesomeIcon icon="lock" /> &nbsp; Decrypt
                </button>
              </div>
              
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

export default Picture;
