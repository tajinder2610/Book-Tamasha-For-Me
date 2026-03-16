# Docker and Kubernetes Changes

## Note

These Docker and Kubernetes files are optional deployment artifacts.
They are restored for reference and future deployment use.
They do not change the current application configuration unless you explicitly use them.

## What is Docker?

Docker is a container platform. It packages an application together with its runtime, dependencies, and configuration into a container image so it can run the same way on different machines.

## Why do we use Docker?

Docker is useful when we want:

- the same app behavior on every machine
- easier setup for developers
- simpler deployment to servers or cloud platforms
- isolation between services
- repeatable builds

## How does Docker help in this project?

This project has multiple moving parts:

- React frontend
- Express backend
- MongoDB
- Redis
- RabbitMQ

Docker helps by running these parts in a controlled environment when a containerized setup is needed.

## What is Kubernetes?

Kubernetes is a container orchestration platform.

Docker helps create and run containers.
Kubernetes helps manage many containers across one or more servers.

## What changes were made and why?

### 1. Added Docker ignore rules

File: `.dockerignore`

Why:

- To keep Docker build context smaller and safer.

### 2. Added production Docker image

File: `Dockerfile`

Why:

- To package the backend and built frontend into one deployable image.

### 3. Added local multi-service container setup

File: `docker-compose.yml`

Why:

- To run app, MongoDB, Redis, and RabbitMQ together if containerized local setup is needed.

### 4. Added Kubernetes manifests

Files:

- `k8s/namespace.yaml`
- `k8s/app-configmap.yaml`
- `k8s/app-secret.example.yaml`
- `k8s/app-deployment.yaml`
- `k8s/app-service.yaml`
- `k8s/redis-deployment.yaml`
- `k8s/redis-service.yaml`

Why:

- To preserve optional cluster deployment setup for future use.
