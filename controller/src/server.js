const express = require('express');
const Orchestrator = require('./orchestrator/orchestrator');

const app = express();
const PORT = process.env.PORT || 3000;

const orchestrator = new Orchestrator();

async function bootstrap() {
    try {
        console.log('=================================');
        console.log('Starting Helix...');
        console.log('=================================\n');

        await orchestrator.connect();

        orchestrator.run();

        console.log('\n=================================');
        console.log('Helix initialized successfully');
        console.log('=================================\n');

        app.listen(PORT, () => {
            console.log(`🌐 API Server running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('\nHelix failed to start');
        console.error(error.message);
        process.exit(1);
    }
}

bootstrap();