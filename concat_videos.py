import os
import sys
import subprocess
from pathlib import Path

def get_sorted_videos(folder):
    """Get a list of .mp4 files sorted by modification date (oldest first)."""
    folder_path = Path(folder)
    videos = [f for f in folder_path.glob("*.mp4") if f.is_file()]
    videos.sort(key=lambda x: x.stat().st_mtime)
    return videos

def create_input_file(video_files, input_txt):
    """Create a temporary text file listing all video files for FFmpeg concatenation."""
    with open(input_txt, 'w', encoding='utf-8') as f:
        for video in video_files:
            f.write(f"file '{video.resolve()}'\n")

def concatenate_videos(folder, output_file="output.mp4"):
    """Concatenate videos losslessly and change frame rate to 25 fps by slowing down playback."""
    video_files = get_sorted_videos(folder)
    if not video_files:
        print("No MP4 files found in the folder.")
        return
    
    input_txt = Path(folder) / "input.txt"
    create_input_file(video_files, input_txt)
    
    command = [
        "ffmpeg", "-f", "concat", "-safe", "0", "-i", str(input_txt), "-c", "copy", "temp.mkv"
    ]
    subprocess.run(command, check=True)
    
    # Adjust frame rate to 25fps without dropping frames
    command = [
        "ffmpeg", "-i", "temp.mkv", "-filter:v", "setpts=30/25*PTS", "-c:v", "libx264", "-preset", "slow", "-crf", "0", "-c:a", "copy", output_file
    ]
    subprocess.run(command, check=True)
    
    # Clean up temporary files
    os.remove(input_txt)
    os.remove("temp.mkv")
    
    print(f"Concatenated video saved as: {output_file}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python script.py <folder_path> <output_file>")
        sys.exit(1)
    
    folder_path = sys.argv[1]
    output_file = sys.argv[2]   
    concatenate_videos(folder_path, output_file)    