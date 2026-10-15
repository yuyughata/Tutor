# Deploying Genova Web to AWS with Cloudflare Tunnels & Cloudflare R2 Storage

This guide covers deploying the Genova web application (Next.js static site + Admin CMS) to **AWS EC2** using **Cloudflare Tunnels** (no Elastic IP, zero inbound firewall ports) and **Cloudflare R2** for all asset storage (covers, page illustrations, and audio songs).

---

## 1. Architecture Overview

```
[ User Browser / Mobile App ]
             │
             ▼ (HTTPS via Cloudflare DNS)
  ┌──────────────────────────────────────────────┐
  │         Cloudflare Edge Network              │
  │  - Free Universal SSL / TLS                  │
  │  - Global CDN & DDoS Protection              │
  │  - Zero Trust Access (optional on /admin/*)  │
  └───────┬──────────────────────────────┬───────┘
          │ (Encrypted Tunnel Egress)    │ (Direct Asset Delivery)
          ▼                              ▼
┌───────────────────────────────┐  ┌────────────────────────────────┐
│           AWS EC2             │  │         Cloudflare R2          │
│  - No Elastic IP              │  │  - S3-compatible, $0 egress    │
│  - Security Group: 0 INBOUND! │  │  - covers/ (Public CDN)        │
│  - Outbound connection to CF  │  │  - pages/  (Private, Signed)   │
│  ┌─────────────────────────┐  │  │  - songs/  (Private, Signed)   │
│  │ Docker Stack:           │  │  └────────────────────────────────┘
│  │  - cloudflared container│  │                   ▲
│  │  - Nginx web container  │──┼───────────────────┘
│  └─────────────────────────┘  │   Presigned PUT/GET URLs via
│  - Admin via AWS SSM Session  │   r2-storage Edge Function
└───────────────────────────────┘
```

### Why No Elastic IP?
1. **Zero Open Inbound Ports:** Standard hosting requires opening ports 80/443 (and 22 for SSH) to the public internet. With Cloudflare Tunnel (`cloudflared`), the EC2 instance connects **outbound** to Cloudflare edge nodes. The AWS Security Group requires **0 inbound rules**.
2. **Cost Savings:** AWS charges $0.005/hour for every public IPv4 address and Elastic IP. A Cloudflare Tunnel uses standard outbound egress and avoids Elastic IP costs entirely.
3. **No SSL Certbot Renewal Headaches:** Cloudflare manages SSL termination automatically at the edge.
4. **Secure Terminal Access via AWS SSM:** You manage the instance using AWS Systems Manager (SSM) Session Manager from the AWS Console or AWS CLI—no open SSH port 22 or SSH keys required.

---

## 2. Cloudflare R2 Storage Setup

Genova stores 3 types of media:
- **`covers`**: Story covers (Public, served via CDN custom domain or R2 dev URL).
- **`pages`**: Story page illustrations (Private, served via short-lived signed URLs).
- **`songs`**: Story audio MP3s (Private, served via short-lived signed URLs).

### Step 2.1: Create R2 Buckets in Cloudflare
1. Open the [Cloudflare Dashboard](https://dash.cloudflare.com/) > **R2 Object Storage**.
2. Create three buckets (or one bucket with prefixes):
   - `genova-covers`
   - `genova-pages`
   - `genova-songs`
3. **Enable Public Access on `genova-covers`**:
   - Go to `genova-covers` > **Settings** > **Public Access**.
   - Either connect a Custom Domain (e.g. `covers.yourdomain.com`) or enable the **R2.dev subdomain** (e.g. `https://pub-xxxx.r2.dev`).
   - Copy this URL—you will use it for `R2_PUBLIC_URL_COVERS`.

### Step 2.2: Configure CORS on All 3 Buckets
In the Cloudflare dashboard for each bucket > **Settings** > **CORS Policy**, add:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```
*(For production, you can restrict `AllowedOrigins` to your domain `https://yourdomain.com`).*

### Step 2.3: Generate R2 API Token
1. In Cloudflare Dashboard > **R2 Object Storage** > **Manage R2 API Tokens**.
2. Click **Create API Token**.
3. Permissions: **Object Read & Write**.
4. TTL: Forever (or per your rotation policy).
5. Copy:
   - **Account ID** (visible on R2 Overview page)
   - **Access Key ID**
   - **Secret Access Key**

### Step 2.4: Deploy the `r2-storage` Supabase Edge Function
Run the following in your terminal:
```bash
# Link your Supabase project (if not linked)
supabase link --project-ref cjdrlddvbyfataumdztg

# Set R2 secrets in Supabase
supabase secrets set \
  R2_ACCOUNT_ID="your_cloudflare_account_id" \
  R2_ACCESS_KEY_ID="your_r2_access_key_id" \
  R2_SECRET_ACCESS_KEY="your_r2_secret_access_key" \
  R2_BUCKET_COVERS="genova-covers" \
  R2_BUCKET_PAGES="genova-pages" \
  R2_BUCKET_SONGS="genova-songs" \
  R2_PUBLIC_URL_COVERS="https://covers.yourdomain.com"

# Deploy the function
supabase functions deploy r2-storage
```

### Step 2.5: Enable R2 in Web Config
In `web/public/config.js`, set:
```javascript
window.GENOVA = {
  supabaseUrl: 'https://cjdrlddvbyfataumdztg.supabase.co',
  supabaseAnonKey: 'your_anon_key',
  storageDriver: 'r2', // Enables Cloudflare R2
};
```

---

## 3. Cloudflare Tunnel Setup

### Step 3.1: Create a Tunnel in Cloudflare Zero Trust
1. Open [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/).
2. Navigate to **Networks** > **Tunnels**.
3. Click **Add a Tunnel** > Select **Cloudflared** > Name it (e.g. `genova-aws`).
4. In the installation screen, choose **Docker** and copy the **Tunnel Token** (the long string following `--token`).
5. In the **Public Hostnames** tab:
   - **Subdomain / Domain:** e.g. `genova.custar.ng` or `yourdomain.com`.
   - **Path:** leave empty.
   - **Type:** `HTTP`.
   - **URL:** `web:80` (this connects directly to the `web` container in the Docker network).
6. Save the tunnel.

---

## 4. Launching the AWS EC2 Instance

### Step 4.1: Launch Instance Configuration
1. Open the [AWS EC2 Console](https://console.aws.amazon.com/ec2/).
2. Click **Launch Instances**.
3. **Name:** `genova-web-prod`.
4. **AMI:** **Amazon Linux 2023** (or **Ubuntu 24.04 LTS**).
5. **Architecture & Instance Type:**
   - **`t4g.small`** (Arm64 Graviton3, ~$0.0168/hr, recommended for performance & cost) or **`t3.micro` / `t3.small`** (x86_64).
6. **Key Pair:** *Proceed without a key pair* (SSM Session Manager will be used).
7. **Network Settings**:
   - **VPC:** Default VPC.
   - **Auto-assign Public IP:** Enable (allows the instance to establish outbound HTTPS connections to Cloudflare and GitHub without needing a NAT Gateway).
   - **Security Group:** Create a new Security Group:
     - **Inbound Rules:** **DELETE ALL INBOUND RULES (0 rules).**
     - **Outbound Rules:** All traffic (0.0.0.0/0).
8. **IAM Instance Profile**:
   - Under **Advanced details** > **IAM instance profile**:
   - Choose or create a role with the AWS managed policy:
     `AmazonSSMManagedInstanceCore`
   - *(This gives you secure web-based browser terminal access via AWS Systems Manager without open ports).*
9. **User Data (Cloud-Init)**:
   - Under **Advanced details** > **User data**, paste the contents of `deploy/ec2-user-data.sh`:
   - **Important:** Replace `CLOUDFLARE_TUNNEL_TOKEN="REPLACE_WITH_YOUR_CLOUDFLARE_TUNNEL_TOKEN"` with your actual token from Step 3.1.
10. Click **Launch Instance**.

---

## 5. Verifying the Deployment

1. Wait 2–3 minutes for EC2 initialization and Docker build.
2. Go to the Cloudflare Zero Trust dashboard > **Networks** > **Tunnels**.
   - Your tunnel status will turn **HEALTHY** (Active).
3. Visit your website domain in the browser (e.g. `https://genova.custar.ng`).
   - The landing page will load with HTTPS provided by Cloudflare.
4. Navigate to `/admin/` in the browser:
   - Sign in as an admin.
   - Create or edit a story, upload a cover and page illustration.
   - The uploads will go directly to your Cloudflare R2 bucket via the presigned URL from the `r2-storage` function.

---

## 6. Day-2 Management & Updates

### 6.1 Connect to the EC2 Terminal
You do not need SSH keys or open ports. In the AWS EC2 Console:
1. Select the `genova-web-prod` instance.
2. Click **Connect** > **Session Manager** > **Connect**.
3. A root/ssm shell opens in your browser!

### 6.2 Redeploying New Code
To redeploy when code changes are pushed:
```bash
sudo -i
cd /opt/genova
./deploy/deploy.sh
```

### 6.3 Checking Logs
```bash
cd /opt/genova
docker compose -f deploy/docker-compose.yml logs -f web
docker compose -f deploy/docker-compose.yml logs -f tunnel
```

---

## 7. Locking Down `/admin/*` with Cloudflare Access (Optional)

To add enterprise-grade Zero Trust protection to your Admin CMS:
1. In Cloudflare Zero Trust > **Access** > **Applications**.
2. Click **Add an Application** > **Self-hosted**.
3. **Application Name:** `Genova Admin CMS`.
4. **Application domain:** `genova.custar.ng/admin*`.
5. **Policies:** Allow only specific team email addresses (e.g. `@custar.ng`) or emails with one-time pin (OTP).
6. Save application.
Now, anyone trying to reach `/admin` must pass Cloudflare's email PIN or Google SSO check before even reaching the web server!
