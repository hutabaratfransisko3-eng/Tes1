import ytdl from '@distube/ytdl-core'

// Mengambil cookie dari Environment Variable di Railway
const youtubeCookie = process.env.YT_COOKIE || ''

export async function ytmp3dl(url) {
  if (!ytdl.validateURL(url)) {
    throw new Error('Invalid YouTube URL.')
  }

  try {
    // Siapkan opsi request, sertakan cookie jika tersedia
    const options = {}
    if (youtubeCookie) {
      options.requestOptions = {
        headers: {
          cookie: youtubeCookie
        }
      }
    }

    // Mengambil informasi video menggunakan cookie agar tidak terkena 429
    const info = await ytdl.getInfo(url, options)
    
    // Mencari format audio terbaik
    const format = ytdl.chooseFormat(info.formats, { 
      quality: 'highestaudio', 
      filter: 'audioonly' 
    })

    if (!format || !format.url) {
      throw new Error('No suitable audio format found.')
    }

    return {
      title: info.videoDetails.title || 'Unknown Video',
      link: format.url
    }
  } catch (error) {
    throw new Error(`YouTube Extraction Failed: ${error.message}`)
  }
}
