import ytdl from '@distube/ytdl-core'

// Mengambil cookie string dari env Railway
const youtubeCookie = process.env.YT_COOKIE || ''

// Fungsi untuk merapikan format cookie teks Netscape menjadi format string yang dipahami HTTP Header
function parseCookies(rawCookie) {
  if (!rawCookie) return ''
  if (rawCookie.includes('COOKIE_NAME') || rawCookie.includes('# Netscape')) {
    // Jika formatnya adalah file text cookies.txt, kita ambil baris yang valid saja
    return rawCookie
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => {
        const parts = line.split('\t')
        if (parts.length >= 7) {
          return `${parts[5]}=${parts[6]}`
        }
        return null
      })
      .filter(Boolean)
      .join('; ')
  }
  return rawCookie
}

export async function ytmp3dl(url) {
  if (!ytdl.validateURL(url)) {
    throw new Error('Invalid YouTube URL.')
  }

  try {
    const options = {}
    
    if (youtubeCookie) {
      const cleanCookie = parseCookies(youtubeCookie)
      options.requestOptions = {
        headers: {
          cookie: cleanCookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    }

    // Ambil info video dari YouTube
    const info = await ytdl.getInfo(url, options)
    
    // Pilih format audio saja dengan kualitas tertinggi
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
