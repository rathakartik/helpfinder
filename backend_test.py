import requests
import sys
import time
import io
import csv
from datetime import datetime

class EmailVerifierAPITester:
    def __init__(self, base_url="https://emailfinder-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.job_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        headers = {}
        if data and not files:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, data=data)
                else:
                    response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_single_email_verification(self):
        """Test single email verification"""
        test_data = {
            "email": "test@example.com",
            "proxy": None
        }
        return self.run_test(
            "Single Email Verification", 
            "POST", 
            "verify-single", 
            200, 
            data=test_data
        )

    def test_single_email_finding(self):
        """Test single email finding"""
        test_data = {
            "firstname": "John",
            "lastname": "Doe", 
            "domain": "example.com",
            "proxy": None
        }
        return self.run_test(
            "Single Email Finding",
            "POST",
            "find-single", 
            200,
            data=test_data
        )

    def test_download_verify_template(self):
        """Test download verify template"""
        success, response = self.run_test(
            "Download Verify Template",
            "GET",
            "download-template/verify",
            200
        )
        if success:
            print("   Template downloaded successfully")
        return success, response

    def test_download_find_template(self):
        """Test download find template"""
        success, response = self.run_test(
            "Download Find Template", 
            "GET",
            "download-template/find",
            200
        )
        if success:
            print("   Template downloaded successfully")
        return success, response

    def test_bulk_verification(self):
        """Test bulk email verification with CSV upload"""
        # Create a test CSV file
        csv_content = "email,name,company\ntest1@example.com,Test User 1,Test Corp\ntest2@example.com,Test User 2,Test Inc\n"
        csv_file = io.StringIO(csv_content)
        
        files = {
            'file': ('test_verify.csv', csv_content, 'text/csv')
        }
        
        success, response = self.run_test(
            "Bulk Email Verification",
            "POST", 
            "verify-bulk",
            200,
            files=files
        )
        
        if success and 'job_id' in response:
            self.job_id = response['job_id']
            print(f"   Job ID: {self.job_id}")
            return True, response
        return False, {}

    def test_bulk_finding(self):
        """Test bulk email finding with CSV upload"""
        # Create a test CSV file
        csv_content = "firstname,lastname,domain,company\nJohn,Doe,example.com,Test Corp\nJane,Smith,test.com,Test Inc\n"
        
        files = {
            'file': ('test_find.csv', csv_content, 'text/csv')
        }
        
        success, response = self.run_test(
            "Bulk Email Finding",
            "POST",
            "find-bulk", 
            200,
            files=files
        )
        
        if success and 'job_id' in response:
            find_job_id = response['job_id']
            print(f"   Job ID: {find_job_id}")
            return True, response
        return False, {}

    def test_job_progress(self):
        """Test job progress tracking"""
        if not self.job_id:
            print("❌ No job ID available for progress testing")
            return False, {}
            
        return self.run_test(
            "Job Progress Tracking",
            "GET",
            f"job-progress/{self.job_id}",
            200
        )

    def test_job_progress_polling(self):
        """Test job progress polling until completion"""
        if not self.job_id:
            print("❌ No job ID available for progress polling")
            return False, {}
            
        print(f"\n🔄 Polling job progress for job: {self.job_id}")
        max_attempts = 30  # Maximum 30 seconds
        attempt = 0
        
        while attempt < max_attempts:
            success, response = self.run_test(
                f"Job Progress Poll #{attempt + 1}",
                "GET", 
                f"job-progress/{self.job_id}",
                200
            )
            
            if success and response:
                status = response.get('status', 'unknown')
                progress = response.get('progress', 0)
                print(f"   Status: {status}, Progress: {progress}%")
                
                if status in ['completed', 'error']:
                    print(f"   Job finished with status: {status}")
                    return status == 'completed', response
                    
            time.sleep(1)
            attempt += 1
            
        print("❌ Job did not complete within timeout")
        return False, {}

    def test_download_results(self):
        """Test downloading results after job completion"""
        if not self.job_id:
            print("❌ No job ID available for results download")
            return False, {}
            
        return self.run_test(
            "Download Results",
            "GET",
            f"download-results/{self.job_id}",
            200,
            params={'filter_type': 'all'}
        )

    def test_invalid_endpoints(self):
        """Test error handling for invalid endpoints"""
        print(f"\n🔍 Testing Error Handling...")
        
        # Test invalid email verification
        invalid_email_data = {"email": "invalid-email", "proxy": None}
        success, response = self.run_test(
            "Invalid Email Verification",
            "POST",
            "verify-single", 
            200,  # Should return 200 but with invalid status
            data=invalid_email_data
        )
        
        # Test missing required fields for finding
        invalid_find_data = {"firstname": "John"}  # Missing lastname and domain
        self.run_test(
            "Invalid Email Finding (Missing Fields)",
            "POST", 
            "find-single",
            422,  # Should return validation error
            data=invalid_find_data
        )
        
        # Test non-existent job progress
        self.run_test(
            "Non-existent Job Progress",
            "GET",
            "job-progress/invalid-job-id",
            404
        )
        
        return True, {}

def main():
    print("🚀 Starting Email Verifier & Finder API Tests")
    print("=" * 60)
    
    tester = EmailVerifierAPITester()
    
    # Test basic endpoints
    tester.test_root_endpoint()
    tester.test_single_email_verification()
    tester.test_single_email_finding()
    
    # Test template downloads
    tester.test_download_verify_template()
    tester.test_download_find_template()
    
    # Test bulk operations
    bulk_success, _ = tester.test_bulk_verification()
    if bulk_success:
        # Test job progress tracking
        tester.test_job_progress()
        
        # Poll until completion
        job_completed, _ = tester.test_job_progress_polling()
        
        if job_completed:
            # Test results download
            tester.test_download_results()
    
    # Test bulk finding
    tester.test_bulk_finding()
    
    # Test error handling
    tester.test_invalid_endpoints()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())