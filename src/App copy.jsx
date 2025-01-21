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

  useEffect(() => {
    // Load existing files
    axios.get('/api/voices').then(res => setVoices(res.data));
    axios.get('/api/videos').then(res => setVideos(res.data));
    axios.get('/api/results').then(res => setResults(res.data));

    // WebSocket connection
    const ws = new WebSocket('ws://localhost:3002');
    
    ws.onmessage = (event) => {
      setConsoleOutput(prev => [...prev, event.data]);
    };

    return () => ws.close();
  }, []);

  const handleGenerateVoice = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/generate-voice', {
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
      const response = await axios.post('/api/upload-video', formData);
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
      await axios.post('/api/process-video', {
        voiceFile: selectedVoice.split('/').pop(),
        videoFile: selectedVideo.split('/').pop()
      });
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

      {/* Existing UI components... */}

      {/* Console Modal */}
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
    </div>
  );
}

export default App;
