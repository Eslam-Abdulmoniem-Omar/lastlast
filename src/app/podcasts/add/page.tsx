"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import { createPodcastWithYouTube } from "../../../lib/firebase/podcastUtils";
import { Podcast } from "../../../lib/types";
import {
  extractYouTubeVideoId,
  convertToEmbedUrl,
  generateTranscriptUrl,
} from "../../../lib/utils/youtubeUtils";

export default function AddPodcastPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [transcriptStatus, setTranscriptStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const [formData, setFormData] = useState<Omit<Podcast, "id">>({
    title: "",
    description: "",
    audioUrl: "https://example.com/audio.mp3", // Default placeholder
    transcriptUrl: "",
    youtubeUrl: "",
    level: "intermediate",
    duration: 0,
    topics: [],
    hostName: "",
    publishedDate: new Date().toISOString(),
    questions: [
      { id: "q1", text: "What is your opinion on this topic?", timestamp: 60 },
    ],
    referenceAnswers: [
      { questionId: "q1", text: "This is a sample reference answer." },
    ],
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    if (name === "topics") {
      setFormData({
        ...formData,
        topics: value.split(",").map((t) => t.trim()),
      });
    } else if (name === "youtubeUrl" && value) {
      // When YouTube URL changes, convert to embed URL if needed
      const embedUrl = convertToEmbedUrl(value);
      setFormData({
        ...formData,
        youtubeUrl: embedUrl || value,
        // Reset transcript URL when YouTube URL changes
        transcriptUrl: "",
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const generateTranscript = async () => {
    if (!formData.youtubeUrl) {
      setError("Please enter a valid YouTube URL first");
      return;
    }

    setIsGeneratingTranscript(true);
    setTranscriptStatus("loading");

    try {
      // Extract video ID from the YouTube URL
      const videoId = extractYouTubeVideoId(formData.youtubeUrl);

      if (!videoId) {
        throw new Error("Could not extract video ID from URL");
      }

      // Call our API endpoint to generate the transcript
      const response = await fetch(`/api/youtube/transcript/${videoId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate transcript");
      }

      const data = await response.json();

      // Update form with transcript URL and success status
      setFormData({
        ...formData,
        transcriptUrl: generateTranscriptUrl(videoId),
        // Estimate duration based on transcript length (rough estimate)
        duration: Math.max(
          formData.duration,
          Math.floor(data.transcript.length / 15)
        ), // ~15 chars per second
      });

      setTranscriptStatus("success");
    } catch (error) {
      console.error("Error generating transcript:", error);
      setError(
        error instanceof Error ? error.message : "Failed to generate transcript"
      );
      setTranscriptStatus("error");
    } finally {
      setIsGeneratingTranscript(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("You must be logged in to add a podcast");
      return;
    }

    if (!formData.title || !formData.description || !formData.youtubeUrl) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Ensure YouTube URL is in embed format
      let youtubeUrl = formData.youtubeUrl;
      if (youtubeUrl && !youtubeUrl.includes("/embed/")) {
        const embedUrl = convertToEmbedUrl(youtubeUrl);
        if (embedUrl) {
          youtubeUrl = embedUrl;
        }
      }

      // If no transcript URL is provided but we have a YouTube URL, generate one
      let transcriptUrl = formData.transcriptUrl;
      if (!transcriptUrl && youtubeUrl) {
        const videoId = extractYouTubeVideoId(youtubeUrl);
        if (videoId) {
          transcriptUrl = generateTranscriptUrl(videoId);
        }
      }

      // Create the podcast
      await createPodcastWithYouTube({
        ...formData,
        youtubeUrl,
        transcriptUrl,
      });

      setSuccess(true);
      // Redirect to dashboard after successful submission
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Error adding podcast:", error);
      setError("Failed to add podcast. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Add YouTube Podcast</h1>

      {success ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Podcast added successfully! Redirecting to dashboard...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700"
              >
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="youtubeUrl"
                className="block text-sm font-medium text-gray-700"
              >
                YouTube URL *
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  id="youtubeUrl"
                  name="youtubeUrl"
                  value={formData.youtubeUrl}
                  onChange={handleChange}
                  required
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="transcriptUrl"
                className="block text-sm font-medium text-gray-700"
              >
                Transcript
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="transcriptUrl"
                  name="transcriptUrl"
                  value={formData.transcriptUrl}
                  onChange={handleChange}
                  readOnly={transcriptStatus === "success"}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={generateTranscript}
                  disabled={isGeneratingTranscript || !formData.youtubeUrl}
                  className="mt-1 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                >
                  {isGeneratingTranscript
                    ? "Generating..."
                    : "Generate Transcript"}
                </button>
              </div>
              {transcriptStatus === "success" && (
                <p className="text-sm text-green-600 mt-1">
                  Transcript generated successfully!
                </p>
              )}
              {transcriptStatus === "error" && (
                <p className="text-sm text-red-600 mt-1">
                  Failed to generate transcript. You can try again or enter a
                  URL manually.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="hostName"
                className="block text-sm font-medium text-gray-700"
              >
                Host Name
              </label>
              <input
                type="text"
                id="hostName"
                name="hostName"
                value={formData.hostName}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="level"
                className="block text-sm font-medium text-gray-700"
              >
                Level
              </label>
              <select
                id="level"
                name="level"
                value={formData.level}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="duration"
                className="block text-sm font-medium text-gray-700"
              >
                Duration (seconds)
              </label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="0"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="topics"
                className="block text-sm font-medium text-gray-700"
              >
                Topics (comma separated)
              </label>
              <input
                type="text"
                id="topics"
                name="topics"
                value={formData.topics.join(", ")}
                onChange={handleChange}
                placeholder="technology, education, science"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                Questions & Reference Answers
              </h3>
              {formData.questions.map((question, index) => (
                <div key={question.id} className="border p-4 rounded-md mb-4">
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Question {index + 1}
                    </label>
                    <input
                      type="text"
                      value={question.text}
                      onChange={(e) => {
                        const newQuestions = [...formData.questions];
                        newQuestions[index].text = e.target.value;
                        setFormData({ ...formData, questions: newQuestions });
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Reference Answer
                    </label>
                    <textarea
                      value={
                        formData.referenceAnswers.find(
                          (a) => a.questionId === question.id
                        )?.text || ""
                      }
                      onChange={(e) => {
                        const newAnswers = [...formData.referenceAnswers];
                        const answerIndex = newAnswers.findIndex(
                          (a) => a.questionId === question.id
                        );
                        if (answerIndex >= 0) {
                          newAnswers[answerIndex].text = e.target.value;
                        } else {
                          newAnswers.push({
                            questionId: question.id,
                            text: e.target.value,
                          });
                        }
                        setFormData({
                          ...formData,
                          referenceAnswers: newAnswers,
                        });
                      }}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const newQuestionId = `q${formData.questions.length + 1}`;
                  setFormData({
                    ...formData,
                    questions: [
                      ...formData.questions,
                      {
                        id: newQuestionId,
                        text: "",
                        timestamp: 0,
                      },
                    ],
                    referenceAnswers: [
                      ...formData.referenceAnswers,
                      {
                        questionId: newQuestionId,
                        text: "",
                      },
                    ],
                  });
                }}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add Question
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
            >
              {isSubmitting ? "Adding..." : "Add Podcast"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
