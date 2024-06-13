# Real-Time Chat Application

This is a simple real-time chat application built using the MERN stack with Cassandra as the database. It allows users to register, login, and send/receive messages in real-time. TailwindCSS is used for styling the application.

## Features

- User Registration
- User Login
- Real-time Messaging
- Responsive UI with TailwindCSS

## Technologies Used

- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: Cassandra
- **Authentication**: JSON Web Tokens (JWT)

## Getting Started

### Prerequisites

- Node.js and npm installed on your machine
- Cassandra installed and running on your machine

### Installation


1. **Backend Setup**:

   Navigate to the `backend` directory and install the dependencies:

    ```bash
    cd chat-app-backend
    npm install
    sudo service cassandra start
    ```

### Running the Application

1. **Start the Backend Server**:

   In the `backend` directory, run the following command:

   First we need to run cassandra in a terminal using this command: 

    ```bash
    cassandra -f 
    ```

   After that we need to run a node server in separate terminal:

    ```bash
    node server.js
    ```

## Usage

1. **Register**: Navigate to the registration page and create a new account.
2. **Login**: Use the credentials to log in.
3. **Chat**: Start sending and receiving messages in real-time.