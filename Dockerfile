FROM public.ecr.aws/lambda/nodejs:18

# Create app directory
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy app source
COPY index.js .
COPY .env .

# Set the handler
CMD [ "index.handler" ] 