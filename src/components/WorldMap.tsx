import Image from "next/image";

interface UserAvatar {
  id: number;
  imageUrl: string;
  position: {
    top: string;
    left: string;
  };
  size: string;
}

export default function WorldMap() {
  // Sample user avatars positioned around the world map
  const userAvatars: UserAvatar[] = [
    {
      id: 1,
      imageUrl: "/avatars/avatar1.jpg",
      position: { top: "30%", left: "20%" },
      size: "70px",
    },
    {
      id: 2,
      imageUrl: "/avatars/avatar2.jpg",
      position: { top: "25%", left: "40%" },
      size: "60px",
    },
    {
      id: 3,
      imageUrl: "/avatars/avatar3.jpg",
      position: { top: "45%", left: "70%" },
      size: "80px",
    },
    {
      id: 4,
      imageUrl: "/avatars/avatar4.jpg",
      position: { top: "20%", left: "80%" },
      size: "50px",
    },
    {
      id: 5,
      imageUrl: "/avatars/avatar5.jpg",
      position: { top: "60%", left: "30%" },
      size: "65px",
    },
    {
      id: 6,
      imageUrl: "/avatars/avatar6.jpg",
      position: { top: "50%", left: "50%" },
      size: "55px",
    },
    {
      id: 7,
      imageUrl: "/avatars/avatar7.jpg",
      position: { top: "35%", left: "60%" },
      size: "75px",
    },
  ];

  return (
    <section className="py-20 relative bg-gradient-to-b from-black via-[#102054]/80 to-black overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold mb-10 leading-tight">
            <span className="text-[#5d9bff]">Most people</span>{" "}
            <span className="text-white">find learning English boring</span>
          </h2>

          {/* User avatars positioned on the map */}
          <div className="relative h-[400px] md:h-[500px] mb-10">
            {userAvatars.map((avatar) => (
              <div
                key={avatar.id}
                className="absolute rounded-full overflow-hidden border-2 border-white/20 shadow-lg transition-transform hover:scale-110 duration-300"
                style={{
                  top: avatar.position.top,
                  left: avatar.position.left,
                  width: avatar.size,
                  height: avatar.size,
                }}
              >
                <Image
                  src={avatar.imageUrl}
                  alt="English learner"
                  fill
                  className="object-cover"
                />
              </div>
            ))}

            {/* Add semi-transparent grid lines to simulate map */}
            <div className="absolute inset-0 grid grid-cols-8 grid-rows-6">
              {Array.from({ length: 48 }).map((_, i) => (
                <div key={i} className="border border-white/5"></div>
              ))}
            </div>
          </div>

          <h2 className="text-4xl md:text-6xl font-bold leading-tight">
            <span className="text-white">... </span>
            <span className="text-[#5d9bff]">so people quit</span>
          </h2>
        </div>
      </div>
    </section>
  );
}
