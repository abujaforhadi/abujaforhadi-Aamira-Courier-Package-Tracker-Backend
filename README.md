Okay, here's a comprehensive `README.md` file for your Aamira Courier Package Tracker Backend repository. This README covers setup, functionality, API documentation, and addresses the specific assumptions and trade-offs relevant to the coding challenge.

-----

````markdown
# Aamira Courier Package Tracker - Backend

url: https://aamira-courier-server.vercel.app/

This repository contains the backend API for the Aamira Courier Package Tracker. It's designed to ingest real-time status updates from couriers, store package data, provide a dashboard view for dispatchers, and generate alerts for stuck packages.

## Table of Contents

1.  [Business Context](#1-business-context)
2.  [High-Level Goals](#2-high-level-goals)
3.  [Technology Stack](#3-technology-stack)
4.  [Features Implemented](#4-features-implemented)
5.  [Getting Started](#5-getting-started)
    * [Prerequisites](#prerequisites)
    * [Installation](#installation)
    * [Environment Variables](#environment-variables)
    * [Running the Application](#running-the-application)
6.  [API Endpoints](#6-api-endpoints)
    * [Authentication](#authentication)
    * [`POST /api/packages/events`](#post-apipackagesevents)
    * [`GET /api/packages`](#get-apipackages)
    * [`GET /api/packages/:id`](#get-apipackagesid)
    * [`PUT /api/packages/:id/status`](#put-apipackagesidstatus)
7.  [Real-time Updates (WebSockets)](#7-real-time-updates-websockets)
8.  [Stuck Package Alerting](#8-stuck-package-alerting)
9.  [Folder Structure](#9-folder-structure)
10. [Assumptions & Trade-offs](#10-assumptions--trade-offs)
11. [Known Limitations & Future Improvements](#11-known-limitations--future-improvements)
12. [License](#12-license)

---

## 1. Business Context

Aamira Courier needs to replace its manual, error-prone package tracking system (spreadsheets and text messages) with a robust, real-time internal Package Tracker. This system allows couriers to report status updates, dispatchers to monitor active packages via a live dashboard, and automated alerts for delayed shipments.

## 2. High-Level Goals

1.  **Ingest Courier Updates:** Provide a reliable REST endpoint for couriers to send package status and location data.
2.  **Store Package State Reliably:** Persist all event history and maintain the current state of each package in a durable database.
3.  **Expose Real-time Dashboard Data:** Enable a frontend dashboard to display current status, location, and ETA for active packages with immediate updates.
4.  **Generate Alerts:** Automatically identify and flag packages that haven't progressed for more than 30 minutes.

## 3. Technology Stack

* **Runtime:** Node.js
* **Language:** TypeScript
* **Web Framework:** Express.js
* **Database:** MongoDB (via Mongoose ODM)
* **Real-time Communication:** Socket.IO
* **Development Tools:** `ts-node-dev` (for hot reloading), `dotenv` (for environment variables), `morgan` (for HTTP logging).

## 4. Features Implemented

* **Courier Update Ingestion:** A single `POST` endpoint handles both initial package creation (with auto-generated ID) and subsequent status/location updates.
* **Idempotency & Out-of-Order Handling:** New events are always appended to history. The package's `current_status` is only updated if the incoming event's timestamp is newer than the current recorded status timestamp, preventing older, out-of-order events from rolling back the main package state.
* **State Persistence:** All package events and current states are stored in MongoDB.
* **Real-time Push Updates:** Utilizes WebSockets (Socket.IO) to push package `created`, `updated`, and `newAlert` events to connected clients (e.g., the Dispatcher Dashboard) instantly.
* **Active Package Retrieval:** An endpoint to fetch all active packages (not DELIVERED or CANCELLED) that have seen activity in the last 24 hours.
* **Single Package Details:** An endpoint to retrieve a complete history and current details for a specific package by its unique ID.
* **Stuck Package Alerting:** A background service periodically checks active packages. If a package has had no status change for over 30 minutes, an alert is logged to the database and emitted via WebSockets to dispatchers.
* **Alert Spam Prevention:** An `is_stuck_alert_triggered` flag on the `Package` model ensures an alert is logged only once per "stuck" incident. The flag is reset when the package's status changes.
* **Basic API Key Security:** All API endpoints are protected by a simple API key transmitted via the `X-API-Key` HTTP header.

## 5. Getting Started

### Prerequisites

* Node.js (v18 or higher recommended)
* npm (Node Package Manager)
* MongoDB (running locally or accessible via a connection string)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/abujaforhadi/abujaforhadi-Aamira-Courier-Package-Tracker-Backend
    cd aamira-courier-server
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Environment Variables

Create a `.env` file in the root of the project (`aamira-courier-server/`) and configure the following:

```ini
PORT=5000
MONGO_URI=mongodb://localhost:27017/aamira_tracker # Or your MongoDB Atlas connection string
API_KEY=your_secure_api_key_here # IMPORTANT: Use a strong, unique key for authentication
````

  * `PORT`: The port the server will listen on. (Default: 5000)
  * `MONGO_URI`: Your MongoDB connection string.
  * `API_KEY`: The secret key required in the `X-API-Key` header for all authenticated API requests.

**Note:** The application is configured to exit if `API_KEY` or `MONGO_URI` are not set, ensuring a secure startup.

### Running the Application

1.  **Start your MongoDB instance.**

2.  **Start the backend server:**

      * **Development Mode (with hot reloading):**

        ```bash
        npm run dev
        ```

        This will compile TypeScript and restart the server on code changes. You should see "Server running on port 5000" and "MongoDB connected successfully." in your console, along with the `API_KEY` for convenience during development.

      * **Production Mode (builds then runs):**

        ```bash
        npm run build # Compile TypeScript files
        npm start     # Run the compiled JavaScript
        ```

## 6\. API Endpoints

All API endpoints are prefixed with `/api` and require authentication via the `X-API-Key` header.

### Authentication

Include the `X-API-Key` header with your configured `API_KEY` in all requests to `/api/*` endpoints.

**Example Header:** `X-API-Key: your_secure_api_key_here`

### `POST /api/packages/events`

Ingests package status updates. This endpoint is idempotent and handles out-of-order events. It can also create new package records.

  * **Description:** Creates a new package if `package_id` is omitted or does not exist. Adds a new event to an existing package's history and updates its current state if the event timestamp is newer.
  * **Request Body (JSON):**
      * **For creating a NEW package (ID auto-generated):**
        ```json
        {
          "status": "CREATED",
          "lat": 23.8103,
          "lon": 90.4125,
          "timestamp": "2025-07-26T17:55:00Z",
          "note": "Label generated in Dhaka office"
        }
        ```
      * **For updating an EXISTING package:**
        ```json
        {
          "package_id": "PKG1722108573123",
          "status": "IN_TRANSIT",
          "lat": 39.7684,
          "lon": -86.1581,
          "timestamp": "2025-07-26T18:22:05Z",
          "note": "Departed Indy hub"
        }
        ```
  * **Responses:**
      * `201 Created`: For new package creation. Returns the new package's details including its generated `package_id`.
      * `200 OK`: For existing package updates. Returns the updated package details.
      * `400 Bad Request`: If `status` or `timestamp` are missing.
      * `401 Unauthorized`/`403 Forbidden`: If API Key is missing or invalid.

### `GET /api/packages`

Retrieves a list of all active packages (not DELIVERED or CANCELLED) that have been updated in the last 24 hours.

  * **Description:** Provides the data for the dispatcher's main dashboard view.
  * **Responses:**
      * `200 OK`: Returns an array of `IPackage` objects.
      * `401 Unauthorized`/`403 Forbidden`: If API Key is missing or invalid.

### `GET /api/packages/:id`

Retrieves a single package's complete details and event history by its unique `package_id`.

  * **Description:** Used for the "drill-down" package detail view.
  * **URL Parameters:**
      * `id` (string): The unique `package_id` (e.g., `PKG1722108573123`).
  * **Responses:**
      * `200 OK`: Returns a single `IPackage` object.
      * `404 Not Found`: If no package with the given `id` exists.
      * `401 Unauthorized`/`403 Forbidden`: If API Key is missing or invalid.

### `PUT /api/packages/:id/status`

Manually updates a package's status. This can be used by dispatchers from the UI.

  * **Description:** Adds a new event to the package's history with the current server timestamp and updates the package's current status and location.
  * **URL Parameters:**
      * `id` (string): The unique `package_id`.
  * **Request Body (JSON):**
    ```json
    {
      "status": "EXCEPTION",
      "lat": 39.7500,
      "lon": -86.1700,
      "note": "Road closure near delivery address"
    }
    ```
      * `status` (string, required): The new status.
      * `lat` (number, optional): New latitude.
      * `lon` (number, optional): New longitude.
      * `note` (string, optional): Additional comment.
  * **Responses:**
      * `200 OK`: Returns the updated `IPackage` object.
      * `400 Bad Request`: If `status` is missing.
      * `404 Not Found`: If no package with the given `id` exists.
      * `401 Unauthorized`/`403 Forbidden`: If API Key is missing or invalid.

## 7\. Real-time Updates (WebSockets)

The backend uses Socket.IO to push real-time updates to connected frontend clients.

  * **Connection Endpoint:** `ws://localhost:5000` (when running locally)
  * **Emitted Events:**
      * `packageCreated (payload: IPackage)`: Emitted when a new package record is successfully created.
      * `packageUpdated (payload: IPackage)`: Emitted whenever an existing package's `current_status` or `current_lat`/`current_lon` changes, or any event is added to its `event_history`.
      * `newAlert (payload: IAlert)`: Emitted when a new "stuck package" alert is triggered.

## 8\. Stuck Package Alerting

A background service runs every `ALERT_CHECK_INTERVAL_MS` (default: 1 minute) to identify stuck packages.

  * **Definition of "Stuck":** A package is considered stuck if its `current_status` is not `DELIVERED` or `CANCELLED`, and its `current_status_timestamp` is older than `STUCK_PACKAGE_THRESHOLD_MS` (default: 30 minutes) from the current time.
  * **Alert Mechanism:** When a stuck package is detected:
    1.  A new `Alert` record is created in the MongoDB database.
    2.  The `is_stuck_alert_triggered` flag on the `Package` document is set to `true` to prevent immediate re-alerting.
    3.  A `newAlert` WebSocket event is emitted to all connected clients.
    4.  A `packageUpdated` WebSocket event is also emitted for the stuck package (to visually highlight it on the dashboard).
  * **Alert Reset:** The `is_stuck_alert_triggered` flag is automatically reset to `false` when a package receives a new status update that changes its `current_status`. This means it will only re-alert if it gets unstuck and then gets stuck again.

## 9\. Folder Structure

```
aamira-courier-server/
├── src/
│   ├── config/              # Environment variable loading and configuration
│   ├── interfaces/          # TypeScript interfaces for data models
│   ├── models/              # Mongoose schemas and models
│   ├── controllers/         # Express route handlers
│   ├── services/            # Business logic (e.g., alert checking)
│   ├── middleware/          # Express middleware (e.g., authentication)
│   ├── routes/              # Express route definitions
│   ├── app.ts               # Express application setup, DB connection, Socket.IO
│   └── server.ts            # Application entry point
├── .env.example             # Example environment variables file
├── tsconfig.json            # TypeScript compiler configuration
├── package.json             # Project dependencies and scripts
└── README.md                # This file
```

## 10\. Assumptions & Trade-offs

  * **Out-of-Order Event Resolution:** Events are appended to `event_history` regardless of timestamp. However, `current_status`, `current_lat`, `current_lon`, and `current_status_timestamp` are only updated if the incoming event's `timestamp` is strictly newer than the currently stored `current_status_timestamp`. This prioritizes the most recent chronological update for the "current" state.
  * **API Security:** A simple API key in the header (`X-API-Key`) is implemented for basic access control, suitable for an internal application demo. This is not a full-fledged authentication/authorization system (e.g., JWT, OAuth).
  * **ETA Computation:** The `eta` field is currently just a `Date` type in the data model and API. The backend does not implement complex logic to compute ETA; it's assumed to be provided by courier updates (optional) or set manually.
  * **Alert Notification Methods:** Alerts are logged to the database and displayed via real-time updates on the dispatcher dashboard. Email, SMS, or browser push notifications are not implemented due to time constraints.
  * **Stuck Alert Frequency:** To prevent spam, a package triggers a "stuck" alert only once until its `current_status` changes.
  * **WebSocket Deployment Strategy:** The Socket.IO server is integrated directly into the Express HTTP server. While this works perfectly for local deployments, serverless platforms like Vercel (where this backend might be deployed) often do not directly support long-lived WebSocket connections on the primary HTTP server route (`/socket.io/`) without specialized configurations or dedicated WebSocket services. For demonstration purposes, **it is recommended to run the backend locally** to fully showcase the real-time WebSocket functionality.

## 11\. Known Limitations & Future Improvements

  * **Robust Error Handling:** While basic `try...catch` is in place, more sophisticated error logging, monitoring, and potentially retry mechanisms for transient database/network errors could be added.
  * **Comprehensive Testing:** Unit, integration, and end-to-end tests would significantly improve reliability.
  * **Scalability for WebSockets:** For very large numbers of concurrent dispatcher users, a dedicated, scalable WebSocket service (e.g., AWS API Gateway WebSockets, PubNub, a separate self-hosted Socket.IO cluster with Redis adapter) would be necessary.
  * **Advanced Dispatcher Features:**
      * Ability for dispatchers to resolve or add notes to alerts.
      * Manual update of ETA.
      * More advanced filtering and search on the package list (e.g., by courier, by region).
      * Interactive map display on the dashboard.
  * **Security Enhancements:** Implement a more robust authentication system (e.g., OAuth 2.0, JWT) and role-based access control.
  * **Logging:** Integrate a dedicated logging library (e.g., Winston, Pino) for structured logging to a centralized system.

## 12\. License

This project is licensed under the MIT License - see the `LICENSE` file for details (if you create one).

-----

```
```