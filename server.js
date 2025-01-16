import express from 'express';
    import cors from 'cors';
    import multer from 'multer';
    import axios from 'axios';
    import fs from 'fs';
    import path from 'path';
    import { WebSocketServer } from 'ws';

    const app = express();
    const upload = multer({ dest: 'uploads/' });
    const voicesDir = 'voices';
    const videosDir = 'videos';
    const resultsDir = 'results';
    
    // Create directories if they don't exist
    [voicesDir, videosDir, resultsDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    });

    const wss = new WebSocketServer({ port: 3002 });
    const clients = new Set();

    wss.on('connection', (ws) => {
      clients.add(ws);
      ws.on('close', () => clients.delete(ws));
    });

    app.use(cors());
    app.use(express.json());
    app.use('/voices', express.static(voicesDir));
    app.use('/videos', express.static(videosDir));
    app.use('/results', express.static(resultsDir));

    const ELEVENLABS_API_KEY = 'your-api-key';
    const VOICES = {
      voice1: 'voice-id-1',
      voice2: 'voice-id-2'
    };

    // Cleanup old files
    const cleanupOldFiles = (dir, maxAge) => {
      const files = fs.readdirSync(dir);
      const now = Date.now();
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
        }
      });
    };

    // Cleanup old files every hour
    setInterval(() => {
      cleanupOldFiles(voicesDir, 7 * 24 * 60 * 60 * 1000); // 1 week
    }, 60 * 60 * 1000);

    app.post('/api/generate-voice', async (req, res) => {
      try {
        const { text, voice } = req.body;
        
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

        const filename = `voice_${Date.now()}.mp3`;
        const filePath = path.join(voicesDir, filename);
        fs.writeFileSync(filePath, audioResponse.data);

        res.json({ success: true, filename });
      } catch (error) {
        console.error(error);
        res.status(500).send('Error generating voice');
      }
    });

    app.post('/api/upload-video', upload.single('video'), (req, res) => {
      try {
        const filename = `video_${Date.now()}${path.extname(req.file.originalname)}`;
        const newPath = path.join(videosDir, filename);
        fs.renameSync(req.file.path, newPath);
        res.json({ success: true, filename });
      } catch (error) {
        console.error(error);
        res.status(500).send('Error uploading video');
      }
    });

    app.post('/api/process-video', async (req, res) => {
      try {
        const { voiceFile, videoFile } = req.body;
        
        const voicePath = path.join(voicesDir, voiceFile);
        const videoPath = path.join(videosDir, videoFile);
        const outputFilename = `result_${Date.now()}.mp4`;
        const outputPath = path.join(resultsDir, outputFilename);

        // Simulate long-running process
        setTimeout(() => {
          // In real implementation, replace this with actual LatentSync command
          fs.copyFileSync(videoPath, outputPath);
        }, 10000); // 10 seconds for demo

        res.json({ success: true, filename: outputFilename });
      } catch (error) {
        console.error(error);
        res.status(500).send('Error processing video');
      }
    });

    app.get('/api/voices', (req, res) => {
      const files = fs.readdirSync(voicesDir)
        .filter(f => f.endsWith('.mp3'))
        .map(f => `/voices/${f}`);
      res.json(files);
    });

    app.get('/api/videos', (req, res) => {
      const files = fs.readdirSync(videosDir)
        .filter(f => ['.mp4', '.mov', '.avi'].includes(path.extname(f)))
        .map(f => `/videos/${f}`);
      res.json(files);
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
