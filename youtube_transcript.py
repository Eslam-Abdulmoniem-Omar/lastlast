from apify_client import ApifyClient

# Initialize the ApifyClient with the provided API token
client = ApifyClient("apify_api_2gxI3CzN5TDVOfpBjhyKK5xeEJn4MT21YAJS")

# YouTube video ID to fetch transcript for
# Replace with any video ID you want to get the transcript for
video_id = "w8rYQ40C9xo"  # This is the example video ID from your original error
video_url = f"https://www.youtube.com/watch?v={video_id}"

# Prepare the Actor input
run_input = {
    "youtubeVideoUrls": [video_url],
    "subtitlesLanguage": "en"  # Specify English language
}

print(f"Fetching transcript for video: {video_url}")

# Run the Actor and wait for it to finish
# Using a free actor "jancurn/youtube-transcript" instead of the paid one
run = client.actor("jancurn/youtube-transcript").call(run_input=run_input)

# Print the dataset URL where results are stored
dataset_url = f"https://console.apify.com/storage/datasets/{run['defaultDatasetId']}"
print(f"💾 Check your complete data at: {dataset_url}")

# Fetch and print Actor results from the run's dataset
print("\nTranscript content:")
for item in client.dataset(run["defaultDatasetId"]).iterate_items():
    print(item) 