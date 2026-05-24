from pydub import AudioSegment
import os

ffmpeg_path = "ffmpeg-8.1.1-essentials_build/bin"

AudioSegment.converter = os.path.join(ffmpeg_path, "ffmpeg.exe")

os.environ["PATH"] += os.pathsep + ffmpeg_path


def convert_mp3(soundIn, soundOut, input_format="wav"):
    sound = AudioSegment.from_file(soundIn, format=input_format)
    sound.export(soundOut, format="mp3")


#convert_mp3("finalSounds/mergedBeach.wav", "finalSounds/Beach.mp3")
#convert_mp3("finalSounds/mergedCity.wav", "finalSounds/City.mp3")
#convert_mp3("finalSounds/mergedScream.wav", "finalSounds/Scream.mp3")
#convert_mp3("finalSounds/mergedStarry.wav", "finalSounds/Starry.mp3", input_format="flac")
#convert_mp3("finalSounds/mergedWinter.wav", "finalSounds/Winter.mp3")
convert_mp3("finalSounds/mergedWater.wav", "finalSounds/Water.mp3")

