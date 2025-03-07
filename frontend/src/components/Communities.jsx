export default function Communities() {
  return (
    <div className="h-full w-180 bg-white border border-gray-400 border-y-0 mt-0 p-3 ">
      <h2 className="text-2xl font-bold">Communities</h2>
      <div className="flex flex-col items-center text-center">
        <img
          src="public/community.jpg"
          alt="Community Illustration"
          className="w-full h-80"
        />
        <h3 className="text-2xl font-bold">Stay connected with a community</h3>
        <p className="text-gray-600 text-sm px-4 mt-3">
          Communities bring members together in topic-based groups, and make it
          easy to get admin announcements. Any community you’re added to will
          appear here.
        </p>
        <p className="text-[#027c61] font-bold cursor-pointer mt-2 flex items-center gap-1">
          See example communities
        </p>
        <button className="bg-[#027c61] text-white px-4 py-2 rounded-full mt-20 hover:bg-green-700">
          <p className="font-bold text-sm">Start your community</p>
        </button>
      </div>
    </div>
  );
}
