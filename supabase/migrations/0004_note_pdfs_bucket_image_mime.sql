-- Allow raster images alongside PDFs in the private note attachments bucket
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
]::text[]
WHERE id = 'note-pdfs';
