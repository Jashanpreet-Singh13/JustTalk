const axios = require("axios");

async function verifyEmail(email) {
    const apiKey = process.env.apikey;
    const apiEmail = process.env.apiemail;
    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${email}`;

    try {
        const response = await axios.get(url);
        console.log(response);
        return response.data.is_smtp_valid.value; 
    } catch (error) {
        console.error("Email verification error:", error);
        return false;
    }
}

module.exports = { verifyEmail }
