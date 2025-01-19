const express = require('express');
const cors = require('cors');
const { igApi } = require("insta-fetcher");
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    message: "Too many requests from this IP, please try again later."
});

app.use(limiter);

app.post('/api/followers', async (req, res) => {
    const { cookies, username } = req.body;

    // Validate cookies and username
    if (!cookies || !username) {
        return res.status(400).json({ error: "Cookies and username are required." });
    }

    if (cookies.length > 1000 || username.length > 30 || !/^[a-zA-Z0-9_.]+$/.test(username)) {
        return res.status(400).json({ error: "Invalid input format." });
    }

    try {
        const ig = new igApi(cookies); // Initialize with user-provided cookies
        const userId = await ig.getIdByUsername(username);
        const followersData = await ig.getAllFollowers(userId);
        const followingData = await ig.getAllFollowing(userId);

        const followerUsernames = followersData.users?.map(user => user.username);
        const followingUsernames = followingData.users?.map(user => user.username);

        const notFollowingBack = followingUsernames.filter(user => !followerUsernames.includes(user));

        res.json({ notFollowingBack });
    } catch (error) {
        console.error("Error during request:", error.message);
        res.status(500).json({ error: "An error occurred while processing your request." });
    }
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
