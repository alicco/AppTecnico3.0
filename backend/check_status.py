import subprocess
import json
import time
import sys

while True:
    try:
        res = subprocess.check_output(['C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe', 'apprunner', 'list-services', '--region', 'eu-central-1'])
        data = json.loads(res)
        
        target_service = None
        for svc in data.get('ServiceSummaryList', []):
            if svc['ServiceName'] == 'apptecnico-api':
                target_service = svc
                break
                
        if not target_service:
            print("Service 'apptecnico-api' not found.")
            time.sleep(10)
            continue
        
        status = target_service['Status']
        print(f"Current status: {status}")
        
        if status != 'OPERATION_IN_PROGRESS':
            print("Finished.")
            break
        
        time.sleep(10)
    except Exception as e:
        print(f"Error: {e}")
        time.sleep(10)
