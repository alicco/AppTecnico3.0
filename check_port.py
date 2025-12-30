import socket

HOST = "aws-1-eu-west-1.pooler.supabase.com"
PORT = 5432

def check():
    try:
        ip = socket.gethostbyname(HOST)
        print(f"Resolved {HOST} to {ip} (IPv4)")
        
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(5)
        s.connect((ip, PORT))
        print(f"SUCCESS: Connected to {HOST}:{PORT}")
        s.close()
    except Exception as e:
        print(f"FAILURE: Could not connect to {HOST}:{PORT} - {e}")

if __name__ == "__main__":
    check()
