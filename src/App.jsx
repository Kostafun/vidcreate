import React, { useState, useEffect } from 'react';
    import axios from 'axios';

    function App() {
      const [text, setText] = useState('');
      const [video, setVideo] = useState(null);
      const [voice, setVoice] = useState('voice1');
      const [loading, setLoading] = useState(false);
      const [progress, setProgress] = useState('');
      const [results, setResults] = useState([]);
      const [ws, setWs] = useState(null);

      useEffect(() => {
        // Connect to WebSocket
        const socket = new WebSocket('ws://localhost:3002');
        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'progress') {
            setProgress(data.data);
          } else if (data.type === 'result') {
            setResults(prev => [`/results/${data.data}`, ...prev]);
          }
        };
        setWs(socket);

        // Load existing results
        axios.get('/api/results').then(res => setResults(res.data));

        return () => socket.close();
      }, []);

      const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setProgress('Starting...');

        const formData = new FormData();
        formData.append('video', video);
        formData.append('text', text);
        formData.append('voice', voice);

        try {
          await axios.post('/api/process', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
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
          <form onSubmit={handleSubmit}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text..."
              required
            />
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideo(e.target.files[0])}
              required
            />
            <select value={voice} onChange={(e) => setVoice(e.target.value)}>
              <option value="voice1">Voice 1</option>
              <option value="voice2">Voice 2</option>
            </select>
            <button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Generate Video'}
            </button>
          </form>

          {progress && <div className="progress">{progress}</div>}

          <div className="results">
            <h2>Processed Videos</h2>
            {results.map((url, i) => (
              <div key={i}>
                <video controls src={url} style={{ width: '100%' }} />
                <a href={url} download>Download</a>
              </div>
            ))}
          </div>
        </div>
      );
    }

    export default App;
