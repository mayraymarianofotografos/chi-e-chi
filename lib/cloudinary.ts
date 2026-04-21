/**
 * Upload directo al cliente (unsigned) — evita el límite de 50MB en Next.js API routes
 * En Cloudinary: Settings > Upload > Add upload preset > Unsigned > vibecheck_unsigned
 */
export async function uploadVideoToCloudinary(
  blob: Blob,
  onProgress?: (percent: number) => void
): Promise<{ videoUrl: string; thumbnailUrl: string }> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!

  const formData = new FormData()
  formData.append('file', blob)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', 'vibecheck-weddings')
  formData.append('resource_type', 'video')

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Progreso real del upload
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText)
        const baseUrl: string = data.secure_url

        // Video optimizado: calidad automática
        const videoUrl = baseUrl.replace(
          '/upload/',
          '/upload/q_auto,vc_auto/'
        )

        // Thumbnail: captura al segundo 1, formato JPG, recorte inteligente
        const thumbnailUrl = baseUrl
          .replace('/upload/', '/upload/so_1,f_jpg,w_400,h_600,c_fill,g_face/')
          .replace(/\.\w+$/, '.jpg')

        resolve({ videoUrl, thumbnailUrl })
      } else {
        let errMsg = `Error Cloudinary: ${xhr.status}`;
        try {
          const errData = JSON.parse(xhr.responseText);
          if (errData.error && errData.error.message) {
            errMsg += ` - ${errData.error.message}`;
          }
        } catch (e) {
          errMsg += ` - ${xhr.responseText}`;
        }
        reject(new Error(errMsg))
      }
    })

    xhr.addEventListener('error', () =>
      reject(new Error('Errore di rete durante il caricamento del video'))
    )

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`)
    xhr.send(formData)
  })
}