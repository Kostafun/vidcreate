import express from 'express';
    import cors from 'cors';
    import multer from 'multer';
    import axios from 'axios';
    import fs from 'fs';
    import path from 'path';
    import { WebSocketServer } from 'ws';

    const app = express();
    const upload = multer({ dest: 'uploads/' });
    const resultsDir = 'results';
    if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir);

    const wss = new WebSocketServer({ port: 3002 });
    const clients = new Set();

    wss.on('connection', (ws) => {
      clients.add(ws);
      ws.on('close', () => clients.delete(ws));
    });

    app.use(cors());
    app.use(express.json());
    app.use('/results', express.static(resultsDir));

    const ELEVENLABS_API_KEY = 'your-api-key';
    const VOICES = {
      voice1: 'voice-id-1',
      voice2: 'voice-id-2'
    };

    const broadcastProgress = (progress) => {
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'progress', data: progress }));
        }
      });
    };

    const broadcastResult = (filename) => {
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'result', data: filename }));
        }
      });
    };

    app.post('/api/process', upload.fields([
      { name: 'video', maxCount: 1 }
    ]), async (req, res) => {
      try {
        const { text, voice } = req.body;
        const videoPath = req.files.video[0].path;
        
        // Generate audio
        broadcastProgress('Generating audio...');
        const audioResponse = await axios.post(
          `https://api.elevenlabs.io/v1/text-to-speech/${VOICES[voice]}`,
          { text },
          {
            headers: {
              'xi-api-key': ELEVENLABS_API_KEY,
              'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer'
          }
        );

        const audioPath = path.join('uploads', `${Date.now()}.mp3`);
        fs.writeFileSync(audioPath, audioResponse.data);

        // Process video
        const outputFilename = `output_${Date.now()}.mp4`;
        const outputPath = path.join(resultsDir, outputFilename);
        
        // Simulate long-running process
        setTimeout(() => {
          // In real implementation, replace this with actual LatentSync command
          fs.copyFileSync(videoPath, outputPath);
          broadcastResult(outputFilename);
        }, 10000); // 10 seconds for demo

        res.json({ success: true });
      } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred');
      }
    });

    app.get('/api/results', (req, res) => {
      const files = fs.readdirSync(resultsDir)
        .filter(f => f.endsWith('.mp4'))
        .map(f => `/results/${f}`);
      res.json(files);
    });

    const PORT = 3001;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
