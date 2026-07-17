const express = require('express');
const Orchestrator = require('./orchestrator/orchestrator');
const connectDB = require('./config/db');
const dotenv = require("dotenv");
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;
const configRoutes = require("./routes/configuration");


dotenv.config();
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));


const orchestrator = new Orchestrator();

async function bootstrap() {
    try {
        console.log('=================================');
        console.log('Starting Helix...');
        console.log('=================================\n');

        await connectDB()

        // await orchestrator.connect();

        // orchestrator.watchEvents();

        // orchestrator.run();

        console.log('\n=================================');
        console.log('Helix initialized successfully');
        console.log('=================================\n');

        app.use("/api",configRoutes);

        app.listen(PORT, () => {
            console.log(`API Server running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Helix failed to start');
        console.error(error.message);
        process.exit(1);
    }
}

bootstrap();