import { Podcast } from "../types";

export const samplePodcast: Podcast = {
  id: "sample-podcast-1",
  title: "The Future of Sustainable Technology",
  description:
    "In this episode, we discuss how emerging technologies are creating sustainable solutions for environmental challenges. From renewable energy innovations to eco-friendly materials, we explore the cutting-edge developments shaping our future.",
  audioUrl: "https://filesamples.com/samples/audio/mp3/sample3.mp3", // Sample audio URL
  transcriptUrl:
    "https://raw.githubusercontent.com/suno-ai/bark/main/assets/transcript.txt", // Sample transcript URL
  youtubeUrl: "https://www.youtube.com/embed/8jP4xpga6yY", // TED Talk on sustainable technology
  level: "intermediate",
  duration: 390, // 6.5 minutes
  topics: ["technology", "sustainability", "environment", "innovation"],
  hostName: "Dr. Sarah Johnson",
  publishedDate: "2024-03-01",
  coverImageUrl:
    "https://placehold.co/400x400/468FE7/FFFFFF?text=Sustainable+Tech",
  questions: [
    {
      id: "q1",
      text: "What do you think is the most important sustainable technology being developed today?",
      timestamp: 120,
    },
    {
      id: "q2",
      text: "How can individuals contribute to technological sustainability in their daily lives?",
      timestamp: 240,
    },
    {
      id: "q3",
      text: "Do you believe governments should provide more incentives for green technology development?",
      timestamp: 300,
    },
  ],
  referenceAnswers: [
    {
      questionId: "q1",
      text: "I believe renewable energy storage solutions are the most critical sustainable technologies today. While we have made significant progress in generating clean energy from solar, wind, and hydro sources, the ability to efficiently store this energy remains a challenge. Advanced battery technologies, particularly those moving beyond lithium-ion to more abundant materials, could revolutionize our ability to power communities reliably with renewable energy. This would address intermittency issues and accelerate our transition away from fossil fuels.",
    },
    {
      questionId: "q2",
      text: "Individuals can contribute to technological sustainability in several practical ways. First, by extending the lifecycle of their electronic devices through repair and refurbishment rather than frequent replacement. Second, by supporting companies with transparent supply chains and sustainable practices. Third, by participating in the sharing economy for rarely-used devices and tools. Finally, by being conscious of energy usage through smart home technology and choosing energy-efficient appliances. These small changes collectively create market demand for more sustainable solutions.",
    },
    {
      questionId: "q3",
      text: "Yes, I strongly believe governments should provide more incentives for green technology development. The climate crisis represents a market failure where environmental costs are not fully reflected in prices. Government incentives help correct this by accelerating innovation and adoption of sustainable technologies. Tax credits, grants, and research funding can reduce risks for early investors and help promising technologies reach commercial scale faster. Additionally, carbon pricing mechanisms create market signals that favor sustainable solutions. The countries that lead in green technology policy today will likely have competitive advantages in the global economy of tomorrow.",
    },
  ],
};
