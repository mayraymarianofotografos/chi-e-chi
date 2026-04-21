// Upload se hace directo desde el cliente a Cloudinary
// Este endpoint ya no es necesario
export async function POST() {
  return Response.json(
    { error: 'Use direct client-side upload to Cloudinary' },
    { status: 410 }
  )
}
