import React, { useState, useEffect } from 'react';
    import axios from 'axios';

    function App() {
      const [text, setText] = useState('');
      const [voice, setVoice] = useState('voice1');
      const [voices, setVoices] = useState([]);
      const [videos, setVideos] = useState([]);
      const [results, setResults] = useState([]);
      const [selectedVoice, setSelectedVoice] = useState('');
      const [selectedVideo, setSelectedVideo] = useState('');
      const [loading, setLoading] = useState(false);

      useEffect(() => {
        // Load existing files
        axios.get('/api/voices').then(res => setVoices(res.data));
        axios.get('/api/videos').then(res => setVideos(res.data));
        axios.get('/api/results').then(res => setResults(res.data));
      }, []);

      const handleGenerateVoice = async () => {
        setLoading(true);
        try {
          const response = await axios.post('/api/generate-voice', {
            text,
            voice
          });
          setVoices(prev => [`/voices/${response.data.filename}`, ...prev]);
        } catch (error) {
          console.error(error);
          alert('Error generating voice');
        } finally {
          setLoading(false);
        }
      };

      const handleUploadVideo = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('video', file);

        try {
          const response = await axios.post('/api/upload-video', formData);
          setVideos(prev => [`/videos/${response.data.filename}`, ...prev]);
        } catch (error) {
          console.error(error);
          alert('Error uploading video');
        }
      };

      const handleProcessVideo = async () => {
        if (!selectedVoice || !selectedVideo) {
          alert('Please select both a voice and a video');
          return;
        }

        setLoading(true);
        try {
          const response = await axios.post('/api/process-video', {
            voiceFile: selectedVoice.split('/').pop(),
            videoFile: selectedVideo.split('/').pop()
          });
          setResults(prev => [`/results/${response.data.filename}`, ...prev]);
        } catch (error) {
          console.error(error);
          alert('Error processing video');
        } finally {
          setLoading(false);
        }
      };

      return (
        <div className="container">
          <h1>Video Voice Sync</h1>

          <div className="section">
            <h2>Generate Voice</h2>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text..."
              required
            />
            <select value={voice} onChange={(e) => setVoice(e.target.value)}>
              <option value="voice1">Voice 1</option>
              <option value="voice2">Voice 2</option>
            </select>
            <button onClick={handleGenerateVoice} disabled={loading || !text}>
              {loading ? 'Generating...' : 'Generate Voice'}
            </button>
          </div>

          <div className="section">
            <h2>Upload Video</h2>
            <input
              type="file"
              accept="video/*"
              onChange={handleUploadVideo}
              disabled={loading}
            />
          </div>

          <div className="section">
            <h2>Available Voices</h2>
            <div className="file-list">
              {voices.map((voice, i) => (
                <div key={i} className="file-item">
                  <audio controls src={voice} />
                  <button onClick={() => setSelectedVoice(voice)}>
                    {selectedVoice === voice ? 'Selected' : 'Select'}
                  </button>
                  <a href={voice} download>Download</a>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <h2>Available Videos</h2>
            <div className="file-list">
              {videos.map((video, i) => (
                <div key={i} className="file-item">
                  <video controls src={video} style={{ width: '200px' }} />
                  <button onClick={() => setSelectedVideo(video)}>
                    {selectedVideo === video ? 'Selected' : 'Select'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <h2>Process Video</h2>
            <button 
              onClick={handleProcessVideo} 
              disabled={loading || !selectedVoice || !selectedVideo}
            >
              {loading ? 'Processing...' : 'Create Final Video'}
            </button>
          </div>

          <div className="section">
            <h2>Results</h2>
            <div className="file-list">
              {results.map((result, i) => (
                <div key={i} className="file-item">
                  <video controls src={result} style={{ width: '200px' }} />
                  <a href={result} download>Download</a>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    export default App;
