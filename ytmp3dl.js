import axios from 'axios'
import FormData from 'form-data'

export async function ytmp3dl(url) {
  if (
    !/^(https?:\/\/)?((www|m)\.)?(youtube\.com\/watch\?[^\s]*?v=|youtu\.be\/)[\w-]{11}(\S*)?$/i.test(url)
  ) {
    throw new Error('Invalid YouTube URL.')
  }

  const form = new FormData()
  form.append('url', url)

  const { data } = await axios.post(
    'https://www.youtubemp3.ltd/convert',
    form,
    {
      headers: {
        ...form.getHeaders(),
        Accept: 'application/json, text/plain, */*',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }
  )

  console.log('YouTube API Response:', data)

  const link = data?.link || data?.url || data?.download || data?.downloadUrl

  if (!link) {
    throw new Error('Download link not found.')
  }

  return {
    title: data.filename || data.title || 'Unknown',
    link
  }
}
