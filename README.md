# Email Verifier & Finder 🚀

A comprehensive full-stack application for email verification and finding, built with FastAPI, React, and MongoDB. Features proxy support, bulk processing, and real-time progress tracking.

## 🔥 Want sales calls from leads? Go to AlexBerman.com/Mastermind 🔥

## ✨ Features

### Email Verification
- **Single Email Verification**: Verify individual email addresses instantly
- **Bulk Email Verification**: Process up to 1000 emails from CSV files
- **Advanced Validation**: Checks syntax, disposable domains, role-based emails, MX records, and SMTP validation
- **Status Categories**: Valid, Invalid, Risky with detailed reasons
- **Filtered Downloads**: Download results by status (valid, invalid, risky)

### Email Finding
- **Single Email Finding**: Find emails using firstname, lastname, and domain
- **Bulk Email Finding**: Process up to 1000 records from CSV files
- **7 Pattern Generation**: Creates up to 7 common email patterns
- **Smart Stopping**: Stops when valid email is found to save resources
- **Web Scraping**: Optional web scraping with proxy rotation for enhanced finding

### Advanced Features
- **Proxy Support**: Optional custom proxy configuration with rotation
- **Real-time Progress**: Live progress tracking for bulk operations
- **Sample Templates**: Download CSV templates for bulk operations
- **Job Management**: Background processing with status tracking
- **Error Handling**: Comprehensive error handling and reporting

## 🚀 Quick Start

### Option 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone [your-repo-url]
   cd email-verifier-finder
   ```

2. **Run the auto-setup script**
   ```bash
   ./setup.sh
   ```

3. **Access the application**
   - Full Application: http://localhost
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8001/api

### Option 2: Manual Development Setup

1. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   yarn install
   yarn start
   ```

3. **MongoDB**
   ```bash
   # Install and start MongoDB locally
   mongod --dbpath /path/to/your/db
   ```

## 📋 Usage Guide

### Single Email Verification
1. Go to "Single Verify" tab
2. Enter email address
3. Optionally configure proxy
4. Click "Verify Email"

### Bulk Email Verification
1. Go to "Bulk Verify" tab
2. Download CSV template or prepare your CSV with 'email' column
3. Upload CSV file (max 1000 records)
4. Monitor real-time progress
5. Download filtered results (valid, risky, invalid, or all)

### Single Email Finding
1. Go to "Single Find" tab
2. Enter firstname, lastname, and domain
3. Optionally configure proxy
4. Click "Find Email"

### Bulk Email Finding
1. Go to "Bulk Find" tab
2. Download CSV template or prepare your CSV with 'firstname', 'lastname', 'domain' columns
3. Upload CSV file (max 1000 records)
4. Monitor real-time progress
5. Download results (found, not found, or all)

### Proxy Configuration
1. Navigate to "Proxy Configuration" section
2. Add proxy list (one per line):
   ```
   http://proxy1:port
   http://proxy2:port
   socks5://proxy3:port
   ```
3. Select current proxy from dropdown
4. Proxy will be used for all verification and finding operations

## 🏗️ Architecture

### Backend (FastAPI)
- **Email Verification**: DNS/MX record validation, SMTP checks
- **Email Finding**: Pattern generation and web scraping
- **Job Processing**: Background task processing with progress tracking
- **Proxy Support**: Rotating proxy configuration
- **File Handling**: CSV upload/download with streaming

### Frontend (React)
- **Responsive UI**: Modern, mobile-friendly interface
- **Real-time Updates**: Live progress tracking with WebSocket-like polling
- **File Management**: Drag-drop uploads and filtered downloads
- **State Management**: React hooks for application state
- **Error Handling**: User-friendly error messages

### Database (MongoDB)
- **Job Storage**: Persistent job status and results
- **Progress Tracking**: Real-time progress updates
- **Result Caching**: Temporary storage for bulk operations

## 🐳 Docker Deployment

The application includes comprehensive Docker support with automated setup script (`setup.sh`).

## 📊 API Endpoints

### Verification
- `POST /api/verify-single`: Verify single email
- `POST /api/verify-bulk`: Start bulk verification job

### Finding
- `POST /api/find-single`: Find single email
- `POST /api/find-bulk`: Start bulk finding job

### Job Management
- `GET /api/job-progress/{job_id}`: Get job progress
- `GET /api/download-results/{job_id}`: Download results

### Templates
- `GET /api/download-template/verify`: Download verification template
- `GET /api/download-template/find`: Download finding template

## 🔥 Want sales calls from leads? Go to AlexBerman.com/Mastermind 🔥
