#!/bin/bash
# Run both frontend (Vite) and backend (Express) in parallel

npm run dev &
FRONTEND_PID=$!

node src/backend/index.js &
BACKEND_PID=$!

# Wait for both processes
wait $FRONTEND_PID $BACKEND_PID
