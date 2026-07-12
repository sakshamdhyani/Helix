const DockerService = require('../services/docker.service');
const ClusterState = require('./cluster-state');
const clusterConfig = require('../config/cluster.config');

class Orchestrator {
    constructor() {
        this.dockerService = new DockerService();
        this.clusterState = new ClusterState();
        this.reconciling = false;
    }

    async connect() {
        console.log('Connecting to Docker...');
        await this.dockerService.connect();
    }

    async run() {
        while (true) {
            try {
                await this.syncClusterState();
                await this.reconcile();
            } catch (error) {
                console.error('Error during reconciliation loop:', error.message);
            }

            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }

    watchEvents() {
        console.log('Watching Docker events...');

        this.dockerService.getEvents((err, stream) => {
            if (err) {
                console.error('Failed to get Docker events:', err.message);
                return;
            }

            stream.on('data', (chunk) => {
                const event = JSON.parse(chunk.toString());

                if (event.Type !== 'container') return;

                if (!['die', 'stop'].includes(event.Action)) return;

                if (event.Actor.Attributes.managedBy !== 'helix') return;

                console.log(`Event: container ${event.Action} -> ${event.Actor.Attributes.name}`);

                this.syncClusterState().then(() => this.reconcile());
            });
        });
    }

    async syncClusterState() {
        const containers = await this.dockerService.listContainers();
        this.updateClusterState(containers);
        this.printClusterState();
    }

    updateClusterState(containers) {
        this.clusterState.clear();
        for (const container of containers) {
            this.clusterState.setContainer(container);
        }
    }

    printClusterState() {
        const containers = this.clusterState.getAllContainers();

        console.log('\n=================================');
        console.log('Current Cluster State');
        console.log('=================================');

        if (containers.length === 0) {
            console.log('No containers in cluster.\n');
            return;
        }

        containers.forEach((container, index) => {
            console.log(`\nContainer #${index + 1}`);
            console.log('------------------------------');
            console.log(`Name   : ${container.name}`);
            console.log(`ID     : ${container.id.substring(0, 12)}`);
            console.log(`Image  : ${container.image}`);
            console.log(`State  : ${container.state}`);
            console.log(`Status : ${container.status}`);
            console.log(`Port   : ${container.hostPort}`);
        });

        console.log('\n=================================\n');
    }

    async reconcile() {
        if (this.reconciling) {
            console.log('Reconciliation already in progress, skipping...');
            return;
        }

        this.reconciling = true;

        try {
            console.log('\n=================================');
            console.log('Starting Reconciliation');
            console.log('=================================\n');

            const containers = this.clusterState.getAllContainers();
            const services = clusterConfig.services;

            console.log(`Total Discovered Containers: ${containers.length}`);
            console.log(`Configured Services: ${services.length}\n`);

            for (const service of services) {
                console.log('----------------------------------------');
                console.log(`Checking Service: ${service.name}`);
                console.log('----------------------------------------');

                const serviceContainers = containers.filter(
                    container => container.labels?.service === service.name && container.state === 'running'
                );

                const actualReplicas = serviceContainers.length;
                const desiredReplicas = service.replicas;
                const difference = desiredReplicas - actualReplicas;

                console.log(`Image              : ${service.image}`);
                console.log(`Desired Replicas   : ${desiredReplicas}`);
                console.log(`Actual Replicas    : ${actualReplicas}`);
                console.log(`Difference         : ${difference}`);
                console.log('');

                if (serviceContainers.length > 0) {
                    console.log('Existing Replicas:\n');
                    serviceContainers.forEach((container, index) => {
                        console.log(`Replica #${index + 1}`);
                        console.log(`   Name   : ${container.name}`);
                        console.log(`   ID     : ${container.id.substring(0, 12)}`);
                        console.log(`   State  : ${container.state}`);
                        console.log(`   Status : ${container.status}`);
                        console.log('');
                    });
                } else {
                    console.log('No running replicas found.\n');
                }

                if (actualReplicas === desiredReplicas) {
                    console.log('Decision: Cluster is healthy.\n');
                } else if (actualReplicas < desiredReplicas) {
                    const replicasToCreate = desiredReplicas - actualReplicas;
                    console.log(`Decision: Need to create ${replicasToCreate} replica(s).`);
                    await this.scaleUp(service);
                } else {
                    const replicasToRemove = actualReplicas - desiredReplicas;
                    console.log(`Decision: Need to remove ${replicasToRemove} replica(s).`);
                    await this.scaleDown(service, replicasToRemove);
                }

                const exitedContainers = containers.filter(
                    container => container.labels?.service === service.name && container.state === 'exited'
                );

                if (exitedContainers.length > 0) {
                    for (const container of exitedContainers) {
                        console.log(`Removing dead container: ${container.name}`);
                        await this.dockerService.removeContainer(container.id);
                    }
                }
            }

            console.log('=================================');
            console.log('Reconciliation Complete');
            console.log('=================================\n');

        } finally {
            this.reconciling = false;
        }
    }

    async scaleUp(service) {
        console.log('\nScaling Up');
        console.log('--------------------------');
        console.log(`Service : ${service.name}`);

        const options = this.buildContainerOptions(service);
        const container = await this.dockerService.createContainer(options);

        console.log('Created container:', container.id);
    }

    async scaleDown(service, replicasToRemove) {
        console.log('\nScaling Down');
        console.log('--------------------------');
        console.log(`Service            : ${service.name}`);
        console.log(`Replicas to Remove : ${replicasToRemove}`);

        const containers = this.clusterState.getAllContainers().filter(
            container => container.labels?.service === service.name && container.state === 'running'
        );

        containers.sort((a, b) => b.createdAt - a.createdAt);

        const toRemove = containers.slice(0, replicasToRemove);

        for (const container of toRemove) {
            console.log(`Removing container: ${container.name}`);
            await this.dockerService.removeContainer(container.id);
        }
    }

    buildContainerOptions(service) {
        const name = this.generateContainerName(service);
        const replicaNumber = parseInt(name.split('-').pop());
        const hostPort = (service.port + replicaNumber).toString();

        return {
            Image: service.image,
            Labels: service.container.labels,
            name: name,
            ExposedPorts: {
                [`${service.port}/tcp`]: {}
            },
            HostConfig: {
                PortBindings: {
                    [`${service.port}/tcp`]: [
                        { HostPort: hostPort }
                    ]
                }
            }
        };
    }

    generateContainerName(service) {
        const containers = this.clusterState.getAllContainers();

        const existingNames = new Set(
            containers.map(container => container.name)
        );

        let replicaNumber = 1;

        while (existingNames.has(`${service.name}-${replicaNumber}`)) {
            replicaNumber++;
        }

        return `${service.name}-${replicaNumber}`;
    }
}

module.exports = Orchestrator;