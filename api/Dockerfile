FROM node:latest
# Create app directory
WORKDIR /usr/src/app
# Install app dependencies
COPY package*.json ./

RUN npm install --silent
# Copy app source code
COPY . .
COPY .env .

#Expose port and start application
EXPOSE 80
CMD ["npm", "start"]