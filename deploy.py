import os
import sys
import zipfile
import shutil
import paramiko

from deploy_config import HOST, PORT, USER, PASS, REMOTE_PATH
ZIP_NAME = "ishkhwaz-dist.zip"

print("--- Ish-khwaz Complete API & Web Deployment ---")

# Step 0: Ensure dist folder has api/
if not os.path.exists("dist"):
    print("Error: dist folder not found. Run 'npm run build' first.")
    sys.exit(1)

dist_api_dir = os.path.join("dist", "api")
os.makedirs(dist_api_dir, exist_ok=True)

# Copy public/api files if present
if os.path.exists("public/api"):
    for f in os.listdir("public/api"):
        if f == "database.sqlite":
            continue # NEVER bundle local database into build zip to preserve live production database!
        src = os.path.join("public/api", f)
        dst = os.path.join(dist_api_dir, f)
        if os.path.isfile(src):
            shutil.copy2(src, dst)

# Step 1: Zip the dist folder
print("[1/3] Packaging web frontend & PHP SQLite REST API into ZIP archive...")
with zipfile.ZipFile(ZIP_NAME, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk("dist"):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, "dist")
            zipf.write(file_path, arcname)

# Step 2: SFTP Upload
print(f"[2/3] Connecting to SSH server {HOST}:{PORT}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

sftp = ssh.open_sftp()
remote_zip_path = f"{REMOTE_PATH}/{ZIP_NAME}"

stdin, stdout, stderr = ssh.exec_command(f"mkdir -p {REMOTE_PATH}")
stdout.channel.recv_exit_status()

sftp.put(ZIP_NAME, remote_zip_path)
sftp.close()

# Step 3: Remote Extraction without overwriting live database.sqlite
print("[3/3] Extracting deployment package on Hostinger (preserving live production database)...")
extract_cmd = f"cd {REMOTE_PATH} && unzip -o {ZIP_NAME} -x 'api/database.sqlite' && rm -f {ZIP_NAME} && chmod 755 api"
stdin, stdout, stderr = ssh.exec_command(extract_cmd)
exit_status = stdout.channel.recv_exit_status()

ssh.close()

if os.path.exists(ZIP_NAME):
    os.remove(ZIP_NAME)

if exit_status == 0:
    print("\n[SUCCESS] ISHKHWAZ API & FRONTEND SUCCESSFULLY DEPLOYED (LIVE DATA PRESERVED!)")
    print("Live API: https://ishkhwaz.zeraworld.com/api/v1/jobs")
    print("Live Website: https://ishkhwaz.zeraworld.com")
else:
    print("\nExtraction failed:", stderr.read().decode('utf-8'))
