# 🚁 FPV Blackbox Tuning Assistant

A fast and completely free web application that analyzes Blackbox Log (CSV) files from FPV drones (Betaflight) and provides automated tuning advice in plain English.

🌍 **Live Demo:** blackbox-tuner.vercel.app
## 🚀 About the Project

This project was created to simplify the FPV drone tuning process. Instead of manually analyzing complex graphs, the app reads your logs and automatically detects tuning issues. Currently, the analysis engine focuses strictly on detecting **P-term overshoot**.

Everything runs exclusively **client-side** (in your browser). There are no backend servers, and your raw log files (CSV) are never uploaded to the internet or stored anywhere.

## ✨ Features (MVP)

*   **Local Upload:** Ultra-fast parsing of `.csv` files extracted from Betaflight.
*   **Client-Side Analysis:** Built-in mathematical algorithm that compares `rcCommand` with `gyroData` and analyzes the `axisP` reaction.
*   **Plain English Advice:** Translates raw data into direct, actionable steps (e.g., "Decrease P-gain by 10%").
*   **100% Privacy:** Your data never leaves your device.

## 🛠️ Tech Stack

*   **Frontend:** React (Next.js / Vite)
*   **Data Processing:** JavaScript (Client-side CSV parsing)
*   **Hosting:** Vercel
