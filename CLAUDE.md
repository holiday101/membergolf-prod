# Project: Member Golf Online

## Deployment

To deploy to production (membergolfonline.com):

1. Merge changes to `main` branch
2. Run `bash deploy.sh` from the repo root (`/Users/jaredholland/golfapp`)

The deploy script SSHs to the EC2 instance, pulls main, builds a Docker image, and restarts the container on port 4000.

## Architecture

- **Client**: React + Vite (client/)
- **Server**: Express + TypeScript (server/)
- **Database**: MySQL
- **Hosting**: AWS EC2 (54.226.186.201)
- **Container**: Docker (multi-stage build via server/Dockerfile)
- **Storage**: AWS S3 (membergolfonline-prod bucket)
