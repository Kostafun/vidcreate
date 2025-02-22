#!/bin/bash
    
    cd /home/kostafun/Projects/LatentSync
    source venv/bin/activate
    python -m scripts.inference --unet_config_path configs/unet/second_stage.yaml --inference_ckpt_path checkpoints/latentsync_unet.pt --guidance_scale 1 --video_path /home/kostafun/Projects/vidcreate/data/videos/angel2_zoom_fs_upscaled.mp4 --audio_path /home/kostafun/Projects/vidcreate/data/voices/voice_1739685485248.mp3 --video_out_path /home/kostafun/Projects/vidcreate/data/results/result_1740211332490.mp4 --start_frame 10  > /home/kostafun/Projects/vidcreate/latentsync.log 2>&1
