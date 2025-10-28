# Instructions

This application requires the following installed on your system:

* **Node.js**
* **Redis** running locally

> ⚠️ Recommended: Use **Google Chrome**. Some features like the Web Speech API may not function correctly on other browsers.


## If you don’t have Node.js or Redis

### Install Node.js

Visit [https://nodejs.org](https://nodejs.org) and follow the installation instructions for your operating system.

### Install Redis

Visit [https://redis.io/download](https://redis.io/download) and follow the installation instructions for your OS.


## Setup the application

1. Clone the repository
2. **Create a `.env` file in the server directory** and set your environment variables:

    ```env
    OPENAI_API_KEY=your_openai_api_key_here
    REDIS_URL=redis://localhost:6379
    ```

    > Replace `your_openai_api_key_here` with your actual OpenAI API key.
    > Replace `redis://localhost:6379` with your Redis URL if different.

3. Navigate to the server directory and install dependencies:

    ```bash
    cd Reviewer_And_Participant/server
    npm install
    ```

4. Navigate to the participant client and install dependencies:

    ```bash
    cd ../participant-client
    npm install
    ```

5. Navigate to the reviewer client and install dependencies:
    
    ```bash
    cd ../reviewer-client
    npm install
    ```


## Running the application

### Start Redis and the server

1. In the server directory, start Redis locally:

```bash
redis-server
```

2. Open a **new terminal window**, stay in the server directory, and start the server:

```bash
npx tsx server.ts
```


### Start the clients

1. Participant client:

```bash
cd ../participant-client
npm run dev
```

2. Reviewer client:

```bash
cd ../reviewer-client
npm run dev
```

## Workflow

Before starting, **enable voice chat**:

1. Open [http://localhost:5174/](http://localhost:5174/) and click on **Enable Speech**.

2. Follow the workflow:

    * **Reviewer:** Press the microphone button and say something like:
      `"latency, retry logic, error states"`

    * **Server:** Calls OpenAI and broadcasts the message.

    * **Participant:** Displays and speaks the clarification question:
      `"Sorry to circle back — could you help me clarify latency, retry logic, and error states?"`

    * If you send multiple messages quickly, they will **play in order** without overlap.

    * Closing and reopening the participant client will **replay any missed messages** in the correct order from the Redis stream.


