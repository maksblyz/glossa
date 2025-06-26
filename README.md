This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Glossa

## Development

### Running the Application

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `UPSTASH_REDIS_REST_URL` - Upstash Redis URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token

3. Run the development server:
```bash
npm run dev
```

### Running the PDF Worker

The PDF processing worker needs to be running separately to process uploaded PDFs:

1. Install Python dependencies:
```bash
cd src/worker
pip install -r requirements.txt
```

2. Run the worker:
```bash
npm run worker
```

Or manually:
```bash
cd src/worker
python pdf_worker.py
```

The worker will continuously poll the Redis queue for new PDF processing jobs and store the extracted text, images, and tables in the database.

## How it Works

1. User uploads a PDF through the web interface
2. File is stored in Vercel Blob storage
3. A job is added to the Redis queue with the file URL and name
4. The Python worker picks up the job and processes the PDF using:
   - Text extraction
   - Image extraction  
   - Table extraction
5. Results are stored in the PostgreSQL database
6. The web interface displays the processed content

## Troubleshooting

If PDFs appear stuck on "Processing PDF... refresh in a few seconds":
1. Make sure the Python worker is running (`npm run worker`)
2. Check that environment variables are properly set
3. Verify the Redis queue has jobs and they're being processed
4. Check the database for processed objects
