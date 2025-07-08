const express = require('express');
const cors = require('cors');
const { igApi } = require('insta-fetcher');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
    function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
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
        const ig = new igApi(cookies);
        const userId = await ig.getIdByUsername(username);
        const followersData = await ig.getAllFollowers(userId);
        const followingData = await ig.getAllFollowing(userId);

        const followerUsernames = followersData.users?.map(user => user.username);
        const followingUsernames = followingData.users?.map(user => user.username);
        await delay(5000)
        const notFollowingBack = followingUsernames.filter(user => !followerUsernames.includes(user));
        await delay(5000)
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
