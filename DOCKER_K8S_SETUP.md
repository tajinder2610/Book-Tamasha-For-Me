# Docker and Kubernetes Setup

## Note

This setup is optional. It is restored for future deployment use and does not affect the current runtime configuration unless you explicitly use Docker or Kubernetes.

## Docker

Build the image:

```bash
docker build -t bookmyshow-app .
```

Run with Docker Compose:

```bash
docker compose up --build
```

This starts:

- `app` on `http://localhost:8082`
- `mongo` on `localhost:27017`
- `redis` on `localhost:6379`
- `rabbitmq` on `localhost:5672`

## Kubernetes

Kubernetes manifests are under `k8s/`.

Apply them with `kubectl apply -f ...` only if you want a cluster-based deployment.
