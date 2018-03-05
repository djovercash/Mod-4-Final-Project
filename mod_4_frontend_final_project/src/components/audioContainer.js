import React from 'react'
import AudioClipList from './audioClipList'
import AudioClip from './audioClip'
import AudioClipUpload from './audioClipUpload'
import AudioClipUpdate from './audioClipUpdate'
import SpectralAnalysis from './spectralAnalysis'
import filestack from 'filestack-js';
import * as d3 from "d3";

const BASEURL = 'http://localhost:3000/clips'

class AudioContainer extends React.Component {

  state = {
    clips: [],
    loaded_clip: {
      id: null,
      url: '',
      title: '',
      artist: '',
      handle: ''
    },
    edit_song: false,
    waveData: null,
    line: null,
    decodedData: null
  }

  source = null

  width = 800;
  height = 200;
  waveHeight = 180;
  timeScale = d3.scaleLinear().range([0, this.width]);

  loadClip = () => {

    fetch(this.state.loaded_clip.url)
    .then(function(response) { return response.arrayBuffer(); })
    .then(buffer => decodeBuffer(buffer));

    let decodeBuffer = (buffer) => {
      this.audioCtx.decodeAudioData(buffer, (decodedData) => {
        this.createWaveform(decodedData);
        this.setState({
          decodedData: decodedData
        })
      });
    }
  }

  playClip = (event) => {
    if (this.source) {this.source.stop()}

    this.source = this.audioCtx.createBufferSource();
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);
    this.source.buffer = this.state.decodedData;
    // console.log(this.source)
    // console.log(this.source.context.currentTime)
    this.source.start(0)
  }

  stopClip = (event) => {
    this.source.stop(0);
  }


  createWaveform = (buffer) => {
    // console.log('original audioBuffer: ', buffer)
    var waveData = buffer.getChannelData(0)
    // console.log('audioBuffer channel data: ', waveData)
    var sampRateAdj = waveData.length > 1000000 ? 500 : 20
    waveData = waveData.filter(function(d,i) {return i % sampRateAdj === 0})
    // console.log('reduced audioBuffer channel data: ', waveData)


    this.timeScale.domain([0, buffer.duration]);

    var line = d3.line()
        .x((d, i) => {return i/waveData.length * this.width})
        .y((d) => {return this.waveHeight/2 * d + this.waveHeight/2});

    this.setState({
      waveData: waveData,
      line: line
    })
  }

  componentDidMount() {
    let clips = this.props.clips
    this.setState({
      clips: [...clips]
    })
  }

  componentWillUnmount() {
  }



  findAudioFile = (event) => {
    let id = parseInt(event.target.id)
    let file = this.state.clips.filter(clip => clip.id === id)
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioCtx.createAnalyser();
    this.dataArray = new Uint8Array(this.analyser.fftSize/2);
    this.setState({
      loaded_clip: {
        id: file[0].id,
        url: file[0].url,
        title: file[0].title,
        artist: file[0].artist,
        handle: file[0].handle
      }
    }, () => this.loadClip())

  }

  stopEdit = (event) => {
    console.log("Yo")
    this.setState({
      edit_song: false
    })
  }

  uploadClip = (event) => {
    const client = filestack.init('AO1rF1TdISrSzbwTPEHFez')
    client.pick({}).then(res => {
      let files = res.filesUploaded
      files.forEach(file => {
        // console.log(file)
        this.fetchCreateBackendItem(file)
        .then(clip => {
          // console.log(clip)
          this.setState({
            clips: [...this.state.clips, clip],
            edit_song: false
          })
        })
      })
    })
  }

  editSongSelection = (event) => {
    this.setState({
      edit_song: true
    })
  }

  updateTitle = (event) => {
    this.setState({
      loaded_clip: {
        ...this.state.loaded_clip,
        title: event.target.value
      }
    })
  }

  updateArtist = (event) => {
    this.setState({
      loaded_clip: {
        ...this.state.loaded_clip,
        artist: event.target.value
      }
    })
  }

  updateClip = (event) => {
    event.preventDefault()
    console.log("In the update")
    console.log(this.state.loaded_clip.title)
    console.log(this.state.loaded_clip.artist)
    let title = this.state.loaded_clip.title
    let artist = this.state.loaded_clip.artist
    let nonEditedClips = this.state.clips.filter(clip => clip.id !== this.state.loaded_clip.id)
    this.fetchUpdateBackendItem(title, artist)
    .then(data => {
      this.setState({
        edit_song: false,
        clips:[...nonEditedClips, data]
      })
    })
  }

  deleteClip = (event) => {
    event.preventDefault()
    let nonDeletedClips = this.state.clips.filter(clip => clip.id !== this.state.loaded_clip.id)
    this.fetchDeleteClipBackend()
    // const client = filestack.init('AO1rF1TdISrSzbwTPEHFez');
    // client.remove(this.state.loaded_clip.handle);
    this.setState({
      clips: [...nonDeletedClips],
      loaded_clip: {
        id: null,
        url: '',
        title: '',
        artist: '',
        handle: ''
      },
      edit_song: false
    })
  }

  fetchCreateBackendItem(file) {
    return fetch(BASEURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: file.url,
        title: file.filename.split('.')[0],
        user_id: this.props.user,
        handle: file.handle
      })
    }).then(res => res.json())
  }

  fetchUpdateBackendItem(title, artist) {
    return fetch(`${BASEURL}/${this.state.loaded_clip.id}`, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: title,
        artist: artist,
      })
    }).then(res => res.json())
  }

  fetchDeleteClipBackend() {
    return fetch(`${BASEURL}/${this.state.loaded_clip.id}`, {
      method: 'DELETE'
    })
  }

  // render() {
  //   return (
  //     <div id="audioContainer">
  //       <div id="uploadAudioClip" >
  //         <AudioClipUpload uploadClip={this.uploadClip}/>
  //       </div>
  //       <div id="userAudioClips">
  //         <AudioClipList clips={this.state.clips} findAudioFile={this.findAudioFile}/>
  //       </div>
  //       <div id="playAudioClip">
  //         <h5>Play shit here</h5>
  //         <AudioClip {...this.state} clip={this.state.loaded_clip} playClip={this.playClip} stopClip={this.stopClip}/>
  //       </div>
  //       <div id="Analysis">
  //         <SpectralAnalysis {...this.state} analyser={this.analyser} dataArray={this.dataArray} />
  //         <div className="specialAnalysis">
  //           <h5>Spatial Analysis</h5>
  //         </div>
  //       </div>

  audioToRender() {
    if (!this.state.edit_song) {
      console.log("But now I'm here")
      return (
        <div id="audioContainer">
          {/* <div id="uploadAudioClip" > */}
            <AudioClipUpload uploadClip={this.uploadClip}/>
          {/* </div> */}
          {/* <div id="userAudioClips"> */}
            <AudioClipList clips={this.state.clips} findAudioFile={this.findAudioFile}/>
          {/* </div> */}
          {/* <div id="playAudioClip"> */}
            {/* <h5>Play shit here</h5> */}
            <AudioClip {...this.state} editSongSelection={this.editSongSelection} clip={this.state.loaded_clip} playClip={this.playClip} stopClip={this.stopClip}/>
          {/* </div> */}
          {/* <div id="Analysis"> */}
            {/* <div className="SpectralAnalysis"> */}
              {/* <h5>Spatial Analysis</h5> */}
              <SpectralAnalysis {...this.state} analyser={this.analyser} dataArray={this.dataArray} />
            {/* </div> */}
          {/* </div> */}
        </div>
      )
    // } else if () {
      // return (
      //   <div id="audioContainer">
      //     <div id="uploadAudioClip" >
      //       <AudioClipUpload uploadClip={this.uploadClip}/>
      //     </div>
      //     <div id="userAudioClips">
      //       <AudioClipList clips={this.state.clips} findAudioFile={this.findAudioFile}/>
      //     </div>
      //     <div id="playAudioClip">
      //       <h5>Play shit here</h5>
      //       <AudioClip {...this.state} editSongSelection={this.editSongSelection} clip={this.state.loaded_clip} playClip={this.playClip} stopClip={this.stopClip}/>
      //     </div>
      //     <div id="Analysis">
      //       <div className="SpectralAnalysis">
      //         <h5>Spatial Analysis</h5>
      //             <SpectralAnalysis {...this.state} analyser={this.analyser} dataArray={this.dataArray} />
      //       </div>
      //     </div>
      //   </div>
      // )
    } else {
      console.log("I bere")
      return (
        <AudioClipUpdate clip={this.state.loaded_clip} updateClip={this.updateClip} updateTitle={this.updateTitle} updateArtist={this.updateArtist} stopEdit={this.stopEdit} deleteClip={this.deleteClip}/>
      )
    }
  }

  render() {
    console.log(this.state.edit_song)
    return (
      this.audioToRender()
    )
  }
}

export default AudioContainer
