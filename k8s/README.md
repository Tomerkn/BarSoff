# Barsoff - Kubernetes Deployment Guide

This guide explains how to deploy the Barsoff project management system to a local Kubernetes cluster (like Docker Desktop or Minikube).

## Prerequisites
1. Kubernetes cluster running (Docker Desktop with Kubernetes enabled, or Minikube).
2. `kubectl` command-line tool installed.

## 1. Build the Docker Images
If you are using Docker Desktop K8s, just build them normally. If using Minikube, run `eval $(minikube docker-env)` first.

```bash
# Build backend image
docker build -t barsuf-backend:latest -f Dockerfile.backend .

# Build frontend image
docker build -t barsuf-frontend:latest -f Dockerfile.frontend .
```

## 2. Deploy to Kubernetes
Apply all the manifests in the `k8s/` directory:

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Apply the rest of the configuration
kubectl apply -f k8s/pvcs.yaml
kubectl apply -f k8s/ollama.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
```

## 3. Access the Application
The frontend service is exposed on NodePort `30080`.
You can access the application in your browser at:
`http://localhost:30080` (or `http://<minikube-ip>:30080` if using minikube).

## 4. Notes
- The first time the `ollama` pod starts, it will automatically pull the `llama3` model (this takes a few minutes depending on your internet connection).
- All SQLite data, uploaded PDFs, and vector embeddings are saved in PersistentVolumes, meaning your data is safe even if the pods are restarted.
