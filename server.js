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
    dotenv.config();

    const app = express();
    const upload = multer({ dest: 'data/uploads/' });
    const voicesDir = 'data/voices';
    const videosDir = 'data/videos';
    const resultsDir = 'data/results';
    const logPath = path.join(__dirname,  'latentsync.log');
    const scriptPath = path.join(__dirname, 'query.sh');

    [voicesDir, videosDir, resultsDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    });

    const wss = new WebSocketServer({ port: 3002 });
    const clients = new Set();

  
    wss.on("connection", (ws) => {
      console.log("New client connected");

      ws.on("message", (message) => {
        console.log(`Received: ${message}`);
        ws.send(`Server received: ${message}`);
      });

      ws.on("close", () => {
        console.log("Client disconnected");
      });
    });

    app.use(cors());
    app.use(express.json());
    app.use('/voices', express.static(voicesDir));
    app.use('/videos', express.static(videosDir));
    app.use('/results', express.static(resultsDir));

    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

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

    app.post('/api/add-to-queue', async (req, res) => {
      try {
        const { voiceFile, videoFile, startFrame } = req.body;
        
        const voicePath = path.join(__dirname, voicesDir, voiceFile);
        const videoPath = path.join(__dirname, videosDir, videoFile);
        const outputFilename = `result_${Date.now()}.mp4`;
        const outputPath = path.join(__dirname, resultsDir, outputFilename);
        

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
          clients.forEach(client => {
            if (client.readyState === wss.OPEN) {
              client.send('LatentSync process finished');
            }
          });
          res.json({ success: true, filename: outputFilename });
        });
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

    app.post('/api/create-query-file', (req, res) => {
      const fileContent = `#!/bin/bash
    
    cd /home/kostafun/Projects/LatentSync
    source venv/bin/activate
    `;
    
      try {
        if (fs.existsSync(scriptPath)) {
          fs.unlinkSync(scriptPath);
        }
        fs.writeFileSync(scriptPath, fileContent);
        res.json({ success: true });
      } catch (error) {
        console.error(error);
        res.status(500).send('Error creating query.sh file');
      }
    });

    app.post('/api/run-query-script', (req, res) => {


      
      // Clear previous output
      if (fs.existsSync(logPath)) {
        fs.unlinkSync(logPath);
      }

      const scriptProcess = spawn(scriptPath);
      let outputInterval;

      // Start polling output.txt
      outputInterval = setInterval(() => {
        if (fs.existsSync(logPath)) {
          const content = fs.readFileSync(logPath, 'utf-8');
          clients.forEach(client => {
            if (client.readyState === wss.OPEN) {
              client.send(content);
            }
          });
        }
      }, 1000);

      scriptProcess.stdout.on('data', (data) => {
        console.log(`Query stdout: ${data}`);
      });

      scriptProcess.stderr.on('data', (data) => {
        console.error(`Query stderr: ${data}`);
      });

      scriptProcess.on('close', (code) => {
        console.log(`Query process exited with code ${code}`);
        clearInterval(outputInterval);
        clients.forEach(client => {
          if (client.readyState === wss.OPEN) {
            client.send('PROCESS_COMPLETE');
          }
        });
        res.json({ success: true });
      });
    });

    const PORT = 3003;
    app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });
