# Dockerfile for OpenCode Memory Plugin Testing
FROM node:20-bullseye-slim

# Set environment variables
ENV NODE_ENV=testing
ENV DEBIAN_FRONTEND=noninteractive

# Set working directory
WORKDIR /usr/src/app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    bash \
    && rm -rf /var/lib/apt/lists/*
# Create npm package tarball locally first
RUN cd /usr/src/app/opencode-memory-plugin && npm pack

# Install TypeScript globally for testing
RUN npm install -g typescript @types/node && \
    npm cache clean --force

# Install the plugin from the local tarball (faster than npm install -g .)
RUN npm install -g /usr/src/app/opencode-memory-plugin/*.tgz && \
    rm /usr/src/app/opencode-memory-plugin/*.tgz

# Verify installation
RUN ls -la ~/.opencode/memory/ && \
    cat ~/.opencode/memory/memory-config.json

# Copy test scripts
COPY test-docker.sh /usr/src/app/test-docker.sh
COPY test-opencode-integration.sh /usr/src/app/test-opencode-integration.sh

# Make test scripts executable
RUN chmod +x /usr/src/app/test-docker.sh && \
    chmod +x /usr/src/app/test-opencode-integration.sh

# Set working directory back to app root
WORKDIR /usr/src/app

# Create a test script to run all tests
RUN echo '#!/bin/bash\n\
echo "========================================="\n\
echo "  OpenCode Memory Plugin - Docker Tests"\n\
echo "========================================="\n\
echo ""\n\
echo "Running basic Docker tests..."\n\
bash /usr/src/app/test-docker.sh\n\
echo ""\n\
echo "Running integration tests..."\n\
bash /usr/src/app/test-opencode-integration.sh\n\
' > /usr/src/app/run-all-tests.sh && chmod +x /usr/src/app/run-all-tests.sh

# Default command - run all tests
CMD ["/bin/bash", "/usr/src/app/run-all-tests.sh"]
