const express = require('express');
const app = express();
const dotenv = require('dotenv');
dotenv.config();
const Orchestrator = require('./orchestrator/orchestrator');
const port = process.env.PORT || 8000;


async function startServer() {


    const orchestrator = new Orchestrator();

    await orchestrator.connect();


    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}


startServer();