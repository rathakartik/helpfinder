from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import csv
import io
import re
import time
import dns.resolver
import smtplib
import asyncio
import threading
import requests
from bs4 import BeautifulSoup
import random
import tempfile

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Email validation regex
EMAIL_REGEX = re.compile(r"[^@]+@[^@]+\.[^@]+")
DISPOSABLE_DOMAINS = {"mailinator.com", "10minutemail.com", "guerrillamail.com", "tempmail.org"}
ROLE_BASED_PREFIXES = {"info", "support", "admin", "sales", "contact", "noreply", "no-reply"}

# Global storage for job data
job_data = {}

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class EmailVerifyRequest(BaseModel):
    email: str
    proxy: Optional[str] = None

class EmailFindRequest(BaseModel):
    firstname: str
    lastname: str
    domain: str
    proxy: Optional[str] = None

class ProxyConfig(BaseModel):
    proxies: List[str] = []

class JobProgress(BaseModel):
    job_id: str
    progress: int
    current_row: int
    total_rows: int
    status: str
    log: str

# Email verification function
def check_email(email: str, proxy: Optional[str] = None) -> tuple[str, str]:
    if not EMAIL_REGEX.match(email):
        return "invalid", "bad_syntax"

    domain = email.split('@')[1]
    local = email.split('@')[0]

    if domain.lower() in DISPOSABLE_DOMAINS:
        return "invalid", "disposable_domain"
    if local.lower() in ROLE_BASED_PREFIXES:
        return "invalid", "role_based"

    try:
        records = dns.resolver.resolve(domain, 'MX')
        mx_record = str(records[0].exchange)
    except Exception:
        return "invalid", "no_mx"

    # Check if domain accepts all emails
    try:
        server = smtplib.SMTP(timeout=10)
        server.connect(mx_record)
        server.helo("example.com")
        server.mail("probe@example.com")
        code, _ = server.rcpt(f"doesnotexist123@{domain}")
        server.quit()
        if code == 250:
            return "risky", "domain_accepts_all"
    except Exception:
        pass

    def smtp_check():
        try:
            server = smtplib.SMTP(timeout=10)
            server.connect(mx_record)
            server.helo("example.com")
            server.mail("verifier@example.com")
            code, _ = server.rcpt(email)
            server.quit()
            return code
        except Exception:
            return None

    code = smtp_check()
    if code in [421, 450, 451, 452, 503]:
        time.sleep(5)
        code = smtp_check()

    if code == 250:
        return "valid", "smtp_ok"
    elif code is None:
        return "risky", "smtp_timeout"
    elif code in [421, 450, 451, 452, 503]:
        return "risky", f"smtp_soft_fail_{code}"
    elif code == 550:
        return "invalid", "smtp_reject"
    else:
        return "invalid", f"smtp_{code}"

# Email finding function
def generate_email_patterns(firstname: str, lastname: str, domain: str) -> List[str]:
    patterns = []
    first = firstname.lower().strip()
    last = lastname.lower().strip()
    
    if first and last and domain:
        patterns = [
            f"{first}.{last}@{domain}",
            f"{first}@{domain}",
            f"{first}{last}@{domain}",
            f"{first[0]}.{last}@{domain}",
            f"{first}.{last[0]}@{domain}",
            f"{first[0]}{last}@{domain}",
            f"{first}{last[0]}@{domain}"
        ]
    
    return patterns

def find_email_with_scraping(firstname: str, lastname: str, domain: str, proxy: Optional[str] = None) -> tuple[Optional[str], str]:
    patterns = generate_email_patterns(firstname, lastname, domain)
    
    # First try common patterns
    for pattern in patterns:
        status, reason = check_email(pattern, proxy)
        if status in ["valid","risky"]:
            return pattern, f"found_pattern_{reason}"
    
    # Try web scraping if patterns don't work
    try:
        search_query = f'"{firstname} {lastname}" "{domain}" email'
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        proxies = None
        if proxy:
            proxies = {'http': proxy, 'https': proxy}
        
        # Simple Google search simulation (in real implementation, you'd want more sophisticated scraping)
        response = requests.get(f"https://www.google.com/search?q={search_query}", 
                              headers=headers, proxies=proxies, timeout=10)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            text = soup.get_text()
            
            # Look for email patterns in the scraped text
            email_matches = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
            for email in email_matches:
                if domain in email and (firstname.lower() in email.lower() or lastname.lower() in email.lower()):
                    status, reason = check_email(email, proxy)
                    if status in ["valid", "risky"]:
                        return email, f"found_scraping_{reason}"
        
        return None, "not_valid_email_found"
    except Exception as e:
        return None, f"no_valid_email_found_error_{str(e)[:50]}"

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Email Verifier & Finder API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

@api_router.post("/verify-single")
async def verify_single_email(request: EmailVerifyRequest):
    status, reason = check_email(request.email, request.proxy)
    return {
        "email": request.email,
        "status": status,
        "reason": reason,
        "timestamp": datetime.utcnow()
    }

@api_router.post("/find-single")
async def find_single_email(request: EmailFindRequest):
    email, reason = find_email_with_scraping(
        request.firstname, 
        request.lastname, 
        request.domain, 
        request.proxy
    )
    return {
        "firstname": request.firstname,
        "lastname": request.lastname,
        "domain": request.domain,
        "found_email": email,
        "reason": reason,
        "timestamp": datetime.utcnow()
    }

@api_router.post("/verify-bulk")
async def verify_bulk_emails(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    job_id = str(uuid.uuid4())
    content = await file.read()
    content_str = content.decode('utf-8')
    
    try:
        reader = list(csv.DictReader(io.StringIO(content_str)))
        total = len(reader)
        
        if total > 1000:
            raise HTTPException(status_code=400, detail="Maximum 1000 records allowed")
        
        email_field = next((f for f in reader[0].keys() if f.lower().strip() == 'email'), None)
        if not email_field:
            raise HTTPException(status_code=400, detail="CSV must contain 'email' column")
        
        job_data[job_id] = {
            "progress": 0,
            "current_row": 0,
            "total_rows": total,
            "status": "processing",
            "log": "Starting bulk verification...",
            "results": [],
            "filename": file.filename,
            "type": "verify"
        }
        
        background_tasks.add_task(process_bulk_verification, job_id, reader, email_field)
        
        return {"job_id": job_id, "total_rows": total}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")

@api_router.post("/find-bulk")
async def find_bulk_emails(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    job_id = str(uuid.uuid4())
    content = await file.read()
    content_str = content.decode('utf-8')
    
    try:
        reader = list(csv.DictReader(io.StringIO(content_str)))
        total = len(reader)
        
        if total > 1000:
            raise HTTPException(status_code=400, detail="Maximum 1000 records allowed")
        
        required_fields = ['firstname', 'lastname', 'domain']
        missing_fields = [f for f in required_fields if not any(f.lower() == col.lower().strip() for col in reader[0].keys())]
        
        if missing_fields:
            raise HTTPException(status_code=400, detail=f"CSV must contain columns: {', '.join(missing_fields)}")
        
        job_data[job_id] = {
            "progress": 0,
            "current_row": 0,
            "total_rows": total,
            "status": "processing",
            "log": "Starting bulk email finding...",
            "results": [],
            "filename": file.filename,
            "type": "find"
        }
        
        background_tasks.add_task(process_bulk_finding, job_id, reader)
        
        return {"job_id": job_id, "total_rows": total}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")

def process_bulk_verification(job_id: str, reader: List[Dict], email_field: str):
    try:
        for i, row in enumerate(reader, 1):
            email = (row.get(email_field) or '').strip()
            if not email:
                status, reason = 'invalid', 'empty_email'
            else:
                status, reason = check_email(email)
            
            result = {**row, 'status': status, 'reason': reason}
            job_data[job_id]['results'].append(result)
            
            percent = int((i / len(reader)) * 100)
            job_data[job_id].update({
                "progress": percent,
                "current_row": i,
                "log": f"✅ {email} → {status} ({reason})"
            })
            
            time.sleep(0.1)  # Small delay to prevent overwhelming servers
        
        job_data[job_id]['status'] = 'completed'
        job_data[job_id]['log'] = f"✅ Completed verification of {len(reader)} emails"
    except Exception as e:
        job_data[job_id]['status'] = 'error'
        job_data[job_id]['log'] = f"❌ Error: {str(e)}"

def process_bulk_finding(job_id: str, reader: List[Dict]):
    try:
        for i, row in enumerate(reader, 1):
            firstname = (row.get('firstname') or '').strip()
            lastname = (row.get('lastname') or '').strip()
            domain = (row.get('domain') or '').strip()
            
            if not all([firstname, lastname, domain]):
                found_email, reason = None, 'missing_data'
            else:
                found_email, reason = find_email_with_scraping(firstname, lastname, domain)
            
            result = {
                **row, 
                'found_email': found_email or 'Not Found',
                'status': 'found' if found_email else 'not_found',
                'reason': reason
            }
            job_data[job_id]['results'].append(result)
            
            percent = int((i / len(reader)) * 100)
            job_data[job_id].update({
                "progress": percent,
                "current_row": i,
                "log": f"🔍 {firstname} {lastname}@{domain} → {found_email or 'Not Found'}"
            })
            
            time.sleep(0.5)  # Longer delay for finding to prevent rate limiting
        
        job_data[job_id]['status'] = 'completed'
        job_data[job_id]['log'] = f"✅ Completed finding emails for {len(reader)} records"
    except Exception as e:
        job_data[job_id]['status'] = 'error'
        job_data[job_id]['log'] = f"❌ Error: {str(e)}"

@api_router.get("/job-progress/{job_id}")
async def get_job_progress(job_id: str):
    job = job_data.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "job_id": job_id,
        "progress": job.get("progress", 0),
        "current_row": job.get("current_row", 0),
        "total_rows": job.get("total_rows", 0),
        "status": job.get("status", "unknown"),
        "log": job.get("log", "")
    }

@api_router.get("/download-results/{job_id}")
async def download_results(job_id: str, filter_type: str = "all"):
    job = job_data.get(job_id)
    if not job or job['status'] != 'completed':
        raise HTTPException(status_code=404, detail="Job not found or not completed")
    
    results = job['results']
    
    # Filter results based on type
    if filter_type == "valid" and job['type'] == 'verify':
        filtered = [r for r in results if r.get('status') == 'valid']
    elif filter_type == "risky" and job['type'] == 'verify':
        filtered = [r for r in results if r.get('status') == 'risky']
    elif filter_type == "invalid" and job['type'] == 'verify':
        filtered = [r for r in results if r.get('status') == 'invalid']
    elif filter_type == "found" and job['type'] == 'find':
        filtered = [r for r in results if r.get('status') == 'found']
    elif filter_type == "not_found" and job['type'] == 'find':
        filtered = [r for r in results if r.get('status') == 'not_found']
    else:
        filtered = results
    
    if not filtered:
        raise HTTPException(status_code=404, detail="No results found for the specified filter")
    
    # Create CSV output
    output = io.StringIO()
    if filtered:
        writer = csv.DictWriter(output, fieldnames=filtered[0].keys())
        writer.writeheader()
        for row in filtered:
            writer.writerow(row)
    
    output.seek(0)
    filename = f"{filter_type}-{job['filename']}"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/download-template/{template_type}")
async def download_template(template_type: str):
    if template_type == "verify":
        template_data = [
            {"email": "john.doe@example.com", "name": "John Doe", "company": "Example Corp"},
            {"email": "jane.smith@test.com", "name": "Jane Smith", "company": "Test Inc"}
        ]
    elif template_type == "find":
        template_data = [
            {"firstname": "John", "lastname": "Doe", "domain": "example.com", "company": "Example Corp"},
            {"firstname": "Jane", "lastname": "Smith", "domain": "test.com", "company": "Test Inc"}
        ]
    else:
        raise HTTPException(status_code=400, detail="Invalid template type")
    
    output = io.StringIO()
    if template_data:
        writer = csv.DictWriter(output, fieldnames=template_data[0].keys())
        writer.writeheader()
        for row in template_data:
            writer.writerow(row)
    
    output.seek(0)
    filename = f"template-{template_type}.csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
