#!/bin/bash

while getopts ":v:a:o:l:s:" opt; do
  case $opt in
    v) video_path="$OPTARG";;
    a) audio_path="$OPTARG";;
    o) video_out_path="$OPTARG";;
    l) log_path="$OPTARG";;
    s) start_frame="$OPTARG";;
    \?) echo "Invalid option -$OPTARG" >&2;;
  esac
done

cd /home/kostafun/Projects/LatentSync
source venv/bin/activate

python -m scripts.inference \
    --unet_config_path "configs/unet/second_stage.yaml" \
    --inference_ckpt_path "checkpoints/latentsync_unet.pt" \
    --guidance_scale 1 \
    --video_path "$video_path" \
    --audio_path "$audio_path" \
    --video_out_path "$video_out_path" \
    --start_frame "$start_frame" \
    > "$log_path" 2>&1