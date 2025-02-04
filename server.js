import express from 'express';
    import cors from 'cors';
    import multer from 'multer';
    import axios from 'axios';
    import fs from 'fs';
    import path from 'path';
    import { WebSocketServer } from 'ws';
    import dotenv from 'dotenv';
    import { spawn } from 'child_process';
    import { fileURLToPath } from 'url';
    import { dirname } from 'path';
    const __dirname = dirname(fileURLToPath(import.meta.url));
    // import { hostname } from 'os';
    dotenv.config();

    const app = express();
    const upload = multer({ dest: 'data/uploads/' });
    const voicesDir = 'data/voices';
    const videosDir = 'data/videos';
    const resultsDir = 'data/results';
    
    // Create directories if they don't exist
    [voicesDir, videosDir, resultsDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    });

    const wss = new WebSocketServer({ port: 3002, host: '0.0.0.0' });
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

    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
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
    // setInterval(() => {
    //   cleanupOldFiles(voicesDir, 7 * 24 * 60 * 60 * 1000); // 1 week
    // }, 60 * 60 * 1000);

    app.post('/api/generate-voice', async (req, res) => {
      try {
        const { text, voice } = req.body;
        
        const audioResponse = await axios.post(
          `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
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
        const { voiceFile, videoFile, startFrame } = req.body;
        
        const voicePath = path.join(__dirname, voicesDir, voiceFile);
        const videoPath = path.join(__dirname, videosDir, videoFile);
        const outputFilename = `result_${Date.now()}.mp4`;
        const outputPath = path.join(__dirname, resultsDir, outputFilename);
        const logPath = path.join(__dirname,  'latentsync.log');

        const latentSync = spawn('./latentsync.sh', [
          '-a', voicePath,
          '-v', videoPath,
          '-o', outputPath,
          '-l', logPath,
          '-s', startFrame
        ]);
        
        
        const sendOutputToClients = () => {
          const output = fs.readFileSync(logPath, 'utf-8');
          clients.forEach(client => {
            if (client.readyState === wss.OPEN) {
              client.send(output);
            }
          });
        };
        const outputInterval = setInterval(sendOutputToClients, 1000);

        latentSync.stdout.on('data', (data) => {
          console.log(`LatentSync stdout: ${data}`);
          // Send stdout data to all connected WebSocket clients
          clients.forEach(client => {
            if (client.readyState === wss.OPEN) {
              client.send(data.toString());
            }
          });
        });

        latentSync.stderr.on('data', (data) => {
          console.error(`LatentSync stderr: ${data}`);
        });

        latentSync.on('close', (code) => {
          console.log(`LatentSync process exited with code ${code}`);
          clearInterval(outputInterval);
          sendOutputToClients();
          // Send a message to indicate the process has finished
          clients.forEach(client => {
            if (client.readyState === wss.OPEN) {
              client.send('LatentSync process finished');
            }
          });
          res.json({ success: true, filename: outputFilename });
        });

        // Simulate long-running process
        // setTimeout(() => {
        //   // In real implementation, replace this with actual LatentSync command
        //   fs.copyFileSync(videoPath, outputPath);
        // }, 10000); // 10 seconds for demo

        // res.json({ success: true, filename: outputFilename });
      } catch (error) {
        console.error(error);
        res.status(500).send('Error processing video');
      }
    });

    app.get('/api/voices', (req, res) => {
      const files = fs.readdirSync(voicesDir)
        .filter(f => f.endsWith('.mp3'))
        .map(f => `/data/voices/${f}`);
      res.json(files);
    });

    app.get('/api/videos', (req, res) => {
      const files = fs.readdirSync(videosDir)
        .filter(f => ['.mp4', '.mov', '.avi', '.mkv'].includes(path.extname(f)))
        .map(f => `/data/videos/${f}`);
      res.json(files);
    });

    app.get('/api/results', (req, res) => {
      const files = fs.readdirSync(resultsDir)
        .filter(f => f.endsWith('.mp4'))
        .map(f => `/data/results/${f}`);
      res.json(files);
    });

    // const PORT = 3003;
    // const HOST = '192.168.68.205';
    // app.listen(PORT, HOST, () => {
    //   console.log(`Server running on ${HOST}:${PORT}`);
    // });


    const PORT = 3003;
    // const HOST = '192.168.68.205';
    app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });