# Use the current Node.js LTS base image.
# Node 20 is the recommended LTS version.
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker's build cache.
# This ensures a full npm install is only triggered if dependencies change.
COPY package*.json ./

# Install Node.js dependencies.
# The --omit=dev flag prevents development dependencies from being installed in the production image.
RUN npm install --omit=dev

# Copy the entire application source code into the container.
COPY . .

# Expose the port the app runs on.
EXPOSE 3000
EXPOSE 80

# The command to run the application.
CMD [ "node", "index.js" ]

