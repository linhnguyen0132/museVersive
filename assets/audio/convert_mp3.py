from pydub import AudioSegment
import os

ffmpeg_path = "ffmpeg-8.1.1-essentials_build/bin"

AudioSegment.converter = os.path.join(ffmpeg_path, "ffmpeg.exe")

os.environ["PATH"] += os.pathsep + ffmpeg_path


def convert_mp3(soundIn, soundOut, input_format="wav"):
    sound = AudioSegment.from_file(soundIn, format=input_format)
    sound.export(soundOut, format="mp3")


#convert_mp3("mergedBeach.wav", "mp3/Beach.mp3")
#convert_mp3("mergedCity.wav", "mp3/City.mp3")
#convert_mp3("mergedScream.wav", "mp3/Scream.mp3")
#convert_mp3("mergedStarry.wav", "mp3/Starry.mp3", input_format="flac")
#convert_mp3("mergedWinter.wav", "mp3/Winter.mp3")
convert_mp3("mergedWater.wav", "mp3/Water.mp3")

