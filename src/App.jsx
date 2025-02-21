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
      const [showConsole, setShowConsole] = useState(false);
      const [consoleOutput, setConsoleOutput] = useState([]);
      const [startFrame, setStartFrame] = useState(0);
      const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3003' : window.location.origin;
      useEffect(() => {
        // Load existing files

        axios.get(`${baseUrl}/api/voices`).then(res => setVoices(res.data));
        axios.get(`${baseUrl}/api/videos`).then(res => setVideos(res.data));
        axios.get(`${baseUrl}/api/results`).then(res => setResults(res.data));
        const ws = new WebSocket(`${baseUrl}/ws`);
    
        ws.onmessage = (event) => {
          setConsoleOutput(prev => [...prev, ...event.data.split('\n')]);
        };
    
        return () => ws.close();
      }, []);

      const handleGenerateVoice = async () => {
        setLoading(true);
        try {
          const response = await axios.post(`${baseUrl}/api/generate-voice`, {
            text,
            voice
          });
          setVoices(prev => [`/data/voices/${response.data.filename}`, ...prev]);
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
          const response = await axios.post(`${baseUrl}/api/upload-video`, formData);
          setVideos(prev => [`/data/videos/${response.data.filename}`, ...prev]);
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
        setShowConsole(true);
        setConsoleOutput([]);
        
     try {
      await axios.post(`${baseUrl}/api/process-video`, {
        voiceFile: selectedVoice.split('/').pop(),
        videoFile: selectedVideo.split('/').pop(),
        startFrame: startFrame
      });
    } catch (error) {
      console.error(error);
      alert('Error processing video');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQueryFile = async () => {
    try {
      await axios.post(`${baseUrl}/api/create-query-file`);
      alert('query.sh file created successfully');
    } catch (error) {
      console.error(error);
      alert('Error creating query.sh file');
    }
  };
  
  const handleRunQueryScript = async () => {
    try {
      await axios.post(`${baseUrl}/api/run-query-script`);
      alert('query.sh script executed successfully');
    } catch (error) {
      console.error(error);
      alert('Error executing query.sh script');
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
              <option value="4tRn1lSkEn13EVTuqb0g">Angel</option>
              <option value="aEO01A4wXwd1O8GPgGlF">Arabella Nakortah</option>
              <option value="pGAwIQNN9UjOkKxjAyGQ">Amelia</option>
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
            <input
              type="number"
              value={startFrame}
              onChange={(e) => setStartFrame(parseInt(e.target.value, 10))}
              placeholder="Start Frame"
            />
            <button 
              // onClick={handleProcessVideo} 
              disabled={loading || !selectedVoice || !selectedVideo}
            >
              {/* {loading ? 'Processing...' : 'Create Final Video'} */}
            Add to query 
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
          {showConsole && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: '20px',
          color: '#fff',
          overflow: 'auto',
          zIndex: 1000
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2>Processing Console</h2>
            <button onClick={() => setShowConsole(false)}>Close</button>
          </div>
          <pre style={{
            backgroundColor: '#000',
            padding: '10px',
            borderRadius: '4px',
            minHeight: '200px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            {consoleOutput.map((line, i) => (
              <div key={i} style={{ color: '#00ff00', marginBottom: '5px' }}>
                {line}
              </div>
            ))}
          </pre>
        </div>
      )}

      <button onClick={handleRunQueryScript} style={{ marginTop: '20px' }}>
        Run query
      </button>
        </div>
      );
    }

    export default App;
