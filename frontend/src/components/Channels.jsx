import { Plus } from "lucide-react"

const  Channels = [
  {
    id: 1,
    name: "WhatsApp",
    followers: "223.4M followers",
    imageUrl: "/whatsapp_icon.webp", 
    verified: true,
  },
  {
    id: 2,
    name: "Facebook",
    followers: "6.5M followers",
    imageUrl: "/facebook.webp",
    verified: true,
  },
  {
    id: 3,
    name: "Instagram",
    followers: "5M followers",
    imageUrl: "/insta.webp", 
    verified: true,
  },
  {
    id: 4,
    name: "LinkedIN",
    followers: "9.4M followers",
    imageUrl: "/linkedin.png",
    verified: true,
  },
  {
    id: 5,
    name: "X",
    followers: "23.6M followers",
    imageUrl: "/X.jpeg",
    verified: true,
  },
]

export default function ChannelsPage() {
  return (
    <div className="h-full w-180 p-3 bg-white border border-gray-400 border-y-0 mt-0">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Channels</h1>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-lg font-medium mb-1">Stay updated on your favorite topics</h2>
          <p className="text-gray-500">Find channels to follow below</p>
        </div>

        <div className="space-y-6">
          {Channels.map((channel) => (
            <div key={channel.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-gray-100">
                  {channel.imageUrl ? (
                    <img
                      src={channel.imageUrl}
                      alt={channel.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">{channel.imageUrl}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{channel.name}</span>
                    {channel.verified && (
                      <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{channel.followers}</p>
                </div>
              </div>
              <button className="px-4 py-1 text-emerald-600 font-medium border border-gray-300 rounded-full hover:bg-gray-50">
                Follow
              </button>
            </div>
          ))}
        </div>

        <button className="w-full mt-8 py-2.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 font-medium">
          Discover more
        </button>
      </div>
    </div>
  )
}

