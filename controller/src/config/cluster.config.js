module.exports = {
    services: [
        {
            name: "app-server",
            image: "app-server",
            replicas: 3,
            port: 8000,
            healthCheck: {
                path: "/health",
                timeout: 5000
            },
            container: {
                labels: {
                    managedBy: "helix",
                    service: "app-server"
                }
            }
        }
    ]
};