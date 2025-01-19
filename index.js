const express = require("express");
const cors = require("cors");
const { igApi } = require("insta-fetcher");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later.",
});
app.use(limiter);

// Utility function for paginated data fetching
const getAllUsers = async (method, userId) => {
  let users = [];
  let nextMaxId = null;

  do {
    const data = await method(userId, { maxId: nextMaxId });
    users = users.concat(data.users);
    nextMaxId = data.next_max_id;
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Delay 1 second per request
  } while (nextMaxId);

  return users;
};

// Route to fetch followers and find users not following back
app.post("/api/followers", async (req, res) => {
  const { cookies, username } = req.body;

  // Validate cookies and username
  if (!cookies || !username) {
    return res.status(400).json({ error: "Cookies and username are required." });
  }

  if (
    cookies.length > 1000 ||
    username.length > 30 ||
    !/^[a-zA-Z0-9_.]+$/.test(username)
  ) {
    return res.status(400).json({ error: "Invalid input format." });
  }

  try {
    const ig = new igApi(cookies);

    // Get user ID
    const userId = await ig.getIdByUsername(username);

    // Fetch followers and following with pagination
    console.log("Fetching followers...");
    const followersData = await getAllUsers(ig.getFollowers.bind(ig), userId);
    console.log("Followers fetched:", followersData.length);

    console.log("Fetching following...");
    const followingData = await getAllUsers(ig.getFollowing.bind(ig), userId);
    console.log("Following fetched:", followingData.length);

    // Process usernames
    const followerUsernames = new Set(
      followersData.map((user) => user.username)
    );
    const followingUsernames = followingData.map((user) => user.username);

    // Find users not following back
    const notFollowingBack = followingUsernames.filter(
      (user) => !followerUsernames.has(user)
    );

    res.json({ notFollowingBack });
  } catch (error) {
    console.error("Error in backend:", error.message);
    res.status(500).json({ error: "An error occurred while processing your request." });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
  
