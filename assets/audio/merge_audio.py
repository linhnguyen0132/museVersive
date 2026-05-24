from pydub import AudioSegment
from pydub.utils import which
import os 

os.environ["PATH"] += os.pathsep + "./ffmpeg-8.1.1-essentials_build/bin"

AudioSegment.converter = "ffmpeg-8.1.1-essentials_build/bin/ffmpeg.exe"
AudioSegment.ffprobe = "ffmpeg-8.1.1-essentials_build/bin/ffprobe.exe"

def mergeSound(paths, adjustments, export_name, max_duration=None):
    try:
        combined = None
        for i in range(len(paths)):
            sound = AudioSegment.from_wav(paths[i])

            if max_duration is not None:
                sound=sound[:max_duration]
            # Control intensity by increasing/decreasing
            sound= sound + adjustments[i]

            if combined is None:
                combined = sound
            else:
                combined = combined.overlay(sound)
    
        print("Merge successful!")

        combined.export(export_name, format = "wav")
        print("Export successful!")

    except Exception as e:
        print(e)

def mergeWithRepeatingSound(background_path,repeating_path,repeat_every_ms,export_name, format, max_duration=None):
    if format == "flac":
        background = AudioSegment.from_file(background_path)
        repeating = AudioSegment.from_file(repeating_path)
    else:
        background = AudioSegment.from_wav(background_path)
        repeating = AudioSegment.from_wav(repeating_path)
    
    if max_duration is not None:
        background = background[:max_duration]

    combined = background

    # Repeat sound every x milliseconds
    for position in range(0, len(background), repeat_every_ms):

        combined = combined.overlay(
            repeating,
            position=position
        )

    combined.export(export_name, format=format)

    print("Export successful!")

# Run functions 
#beachPic = mergeSound(["sounds/beachwaves.wav","sounds/peopletalking.wav"],[-8,12], "mergedBeach.wav", max_duration=30000)
#winterPic = mergeSound(["sounds/chopwood.wav", "sounds/horse.wav", "sounds/winterforest.wav"],[0,0,0], "mergedWinter.wav", max_duration=30000)
#cityPic = mergeSound(['sounds/bells.wav','sounds/horsesWalking.wav'], [-10,0],"mergedCity.wav", max_duration=30000)
#screamPic = mergeWithRepeatingSound("sounds/whispering.wav","sounds/scream.wav",4000, "mergedScream.wav", "wav")
#starry = mergeWithRepeatingSound("sounds/night.flac", "sounds/dreams.flac", 9000, "mergedStarry.wav", "flac",max_duration=30000)
water = mergeSound(["sounds/beachwaves.wav"],[-8,12], "mergedWater.wav", max_duration=30000)
