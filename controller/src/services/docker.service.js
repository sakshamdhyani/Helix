const Docker = require('dockerode');

class DockerService {
    constructor() {
        this.docker = new Docker();
    }

    /**
     * Convert Docker's container object into Helix's container model
     */
    mapContainer(container) {
        return {
            id: container.Id,
            name: container.Names[0].replace('/', ''),
            image: container.Image,
            state: container.State,
            status: container.Status,
            labels: container.Labels,
            createdAt: container.Created,
            hostPort: container.Ports[0]?.PublicPort  // ← add this
        };
    }

    async connect() {
        try {
            await this.docker.ping();

            const version = await this.docker.version();

            console.log('Connected to Docker');
            console.log(`Docker Engine Version: ${version.Version}`);

            return version;
        } catch (error) {
            throw new Error(`Failed to connect to Docker: ${error.message}`);
        }
    }

    async listContainers(all = true) {
        try {
            const containers = await this.docker.listContainers({
                all: true,
                filters: {
                    label: ['managedBy=helix']
                }
            });

            // Convert Docker containers into Helix container objects
            return containers.map(container => this.mapContainer(container));
        } catch (error) {
            throw new Error(`Failed to list containers: ${error.message}`);
        }
    }

    async startContainer(containerId) {
        try {
            const container = this.docker.getContainer(containerId);

            await container.start();

            console.log(`Started container: ${containerId}`);
        } catch (error) {
            throw new Error(`Failed to start container ${containerId}: ${error.message}`);
        }
    }

    async stopContainer(containerId) {
        try {
            const container = this.docker.getContainer(containerId);

            await container.stop();

            console.log(`Stopped container: ${containerId}`);
        } catch (error) {
            throw new Error(`Failed to stop container ${containerId}: ${error.message}`);
        }
    }

    async removeContainer(containerId) {
        try {
            const container = this.docker.getContainer(containerId);

            await container.remove({ force: true });

            console.log(`Removed container: ${containerId}`);
        } catch (error) {
            throw new Error(`Failed to remove container ${containerId}: ${error.message}`);
        }
    }

    async createContainer(options) {
        try {
            console.log('\n🐳 Creating container...');
            console.log(options);

            const container = await this.docker.createContainer(options);

            console.log(`Container created: ${container.id}`);

            await container.start();

            return container;
        } catch (error) {
            throw new Error(`Error creating container: ${error.message}`);
        }
    }

}

module.exports = DockerService;