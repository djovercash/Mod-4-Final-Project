import React from 'react'
import AudioClipList from './audioClipList'

const BASEURL = 'http://localhost:3000/clips'

class AudioContainer extends React.Component {

  state = {
    clips: [],
    loaded_clip: {}
  }

  fetchClips() {
    return fetch(BASEURL).then(res => res.json())
  }

  componentDidMount() {
    this.fetchClips()
    .then(data => {
      this.setState({
        clips: data
      })
    })
  }

  render() {
    return (
      <div id="audioContainer">
        <div id="userAudioClips">
          <AudioClipList clips={this.state.clips}/>
        </div>
        <div id="playAudioClip">
          <h5>Play shit here</h5>
          <h5>Wave</h5>
        </div>
        <div id="Analysis">
          <div className="specialAnalysis">
            <h5>Spatial Analysis</h5>
          </div>
          <div className="specialAnalysis">
            <h5>Spectral Analysis</h5>
          </div>
        </div>
      </div>
    )
  }
}

export default AudioContainer
