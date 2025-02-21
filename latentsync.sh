#!/bin/bash
LATENT_DIR="/home/kostafun/Projects/LatentSync"
VIDCREATE_DIR="/home/kostafun/Projects/vidcreate"

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
# echo $LATENT_DIR
#cd /home/kostafun/Projects/LatentSync
# source venv/bin/activate

echo "python -m scripts.inference --unet_config_path configs/unet/second_stage.yaml --inference_ckpt_path checkpoints/latentsync_unet.pt --guidance_scale 1 --video_path $video_path --audio_path $audio_path --video_out_path $video_out_path --start_frame $start_frame" >> $VIDCREATE_DIR/query.sh
chmod 755 $VIDCREATE_DIR/query.sh